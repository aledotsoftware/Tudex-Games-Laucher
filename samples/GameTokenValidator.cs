using System;
using System.Security.Cryptography;
using System.Text;

namespace TudexSecurity
{
    /// <summary>
    /// Ejemplo de Validación de Token de Lanzamiento en C# (.NET / Unity)
    /// Comprueba que el juego fue iniciado desde Tudex Games Launcher oficial.
    /// </summary>
    public class GameTokenValidator
    {
        // El mismo Secreto Criptográfico configurado en el Launcher backend (src/main/index.js)
        private const string LAUNCHER_SECRET = "TudexLauncherSecretKey2026";
        
        // Tolerancia máxima de expiración del token (ej. 2 minutos)
        private const int MAX_TOKEN_AGE_SECONDS = 120;

        public static bool ValidateLaunchToken(string[] args, string gameName)
        {
            string tokenArg = null;
            foreach (var arg in args)
            {
                if (arg.StartsWith("--launcher-token="))
                {
                    tokenArg = arg.Substring("--launcher-token=".Length).Trim('"');
                    break;
                }
            }

            if (string.IsNullOrEmpty(tokenArg))
            {
                Console.WriteLine("❌ ERROR: No se proporcionó el token de lanzamiento oficial (--launcher-token).");
                return false;
            }

            // Formato del Token: "gameName:timestamp:nonce:signature"
            string[] parts = tokenArg.Split(':');
            if (parts.Length != 4)
            {
                Console.WriteLine("❌ ERROR: El formato del token de lanzamiento es inválido.");
                return false;
            }

            string tokenGameName = parts[0];
            string timestampStr = parts[1];
            string nonce = parts[2];
            string receivedSignature = parts[3];

            // 1. Validar nombre del juego
            if (!string.Equals(tokenGameName, gameName, StringComparison.OrdinalIgnoreCase))
            {
                Console.WriteLine($"❌ ERROR: El token fue emitido para '{tokenGameName}' pero el juego actual es '{gameName}'.");
                return false;
            }

            // 2. Validar expiración (Anti-Replay Attack)
            if (!long.TryParse(timestampStr, out long tokenTimestamp))
            {
                Console.WriteLine("❌ ERROR: Timestamp del token inválido.");
                return false;
            }

            long currentTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            double ageInSeconds = Math.Abs(currentTimestamp - tokenTimestamp) / 1000.0;

            if (ageInSeconds > MAX_TOKEN_AGE_SECONDS)
            {
                Console.WriteLine($"❌ ERROR: El token de lanzamiento ha expirado (Antigüedad: {ageInSeconds:F1}s).");
                return false;
            }

            // 3. Validar Firma HMAC-SHA256
            string payload = $"{tokenGameName}:{timestampStr}:{nonce}";
            string expectedSignature = ComputeHmacSha256(payload, LAUNCHER_SECRET);

            if (!string.Equals(receivedSignature, expectedSignature, StringComparison.OrdinalIgnoreCase))
            {
                Console.WriteLine("❌ ERROR: Firma criptográfica del token inválida. Posible alteración de ejecución.");
                return false;
            }

            Console.WriteLine("✅ TOKEN OFICIAL VALIDADO CON ÉXITO. El juego se inició correctamente desde Tudex Launcher.");
            return true;
        }

        private static string ComputeHmacSha256(string data, string key)
        {
            using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key)))
            {
                byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
                StringBuilder hex = new StringBuilder(hash.Length * 2);
                foreach (byte b in hash)
                {
                    hex.AppendFormat("{0:x2}", b);
                }
                return hex.ToString();
            }
        }

        public static void Main(string[] args)
        {
            if (!ValidateLaunchToken(args, "neo"))
            {
                Console.WriteLine("🔒 Acceso denegado. Cerrando la aplicación...");
                Environment.Exit(1);
            }

            Console.WriteLine("🎮 ¡Iniciando bucle principal del juego!");
        }
    }
}
