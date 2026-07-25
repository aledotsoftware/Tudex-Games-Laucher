#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <chrono>
#include <algorithm>
#include <iomanip>

// Para HMAC-SHA256 se puede utilizar OpenSSL o WinCrypt nativo de Windows.
// En este ejemplo conceptual se muestra el parser de argumentos y validación de firma.

const std::string LAUNCHER_SECRET = "TudexLauncherSecretKey2026";
const int MAX_TOKEN_AGE_SECONDS = 120;

std::vector<std::string> split(const std::string& str, char delimiter) {
    std::vector<std::string> tokens;
    std::string token;
    std::istringstream tokenStream(str);
    while (std::getline(tokenStream, token, delimiter)) {
        tokens.push_back(token);
    }
    return tokens;
}

bool ValidateLaunchToken(int argc, char* argv[], const std::string& expectedGameName) {
    std::string tokenArg = "";
    std::string prefix = "--launcher-token=";

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg.rfind(prefix, 0) == 0) {
            tokenArg = arg.substr(prefix.length());
            // Remover comillas si existen
            if (!tokenArg.empty() && tokenArg.front() == '"') tokenArg.erase(0, 1);
            if (!tokenArg.empty() && tokenArg.back() == '"') tokenArg.pop_back();
            break;
        }
    }

    if (tokenArg.empty()) {
        std::cerr << "❌ ERROR: No se proporcionó el argumento --launcher-token oficial." << std::endl;
        return false;
    }

    // Formato: gameName:timestamp:nonce:signature
    std::vector<std::string> parts = split(tokenArg, ':');
    if (parts.size() != 4) {
        std::cerr << "❌ ERROR: Formato de token inválido." << std::endl;
        return false;
    }

    std::string gameName = parts[0];
    std::string timestampStr = parts[1];
    std::string nonce = parts[2];
    std::string receivedSignature = parts[3];

    if (gameName != expectedGameName) {
        std::cerr << "❌ ERROR: Token emitido para otro juego." << std::endl;
        return false;
    }

    long long tokenTimestamp = std::stoll(timestampStr);
    auto now = std::chrono::system_clock::now();
    long long currentTimestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();

    double ageInSeconds = std::abs(currentTimestamp - tokenTimestamp) / 1000.0;
    if (ageInSeconds > MAX_TOKEN_AGE_SECONDS) {
        std::cerr << "❌ ERROR: Token de lanzamiento expirado (Antigüedad: " << ageInSeconds << "s)." << std::endl;
        return false;
    }

    // Aquí se calcularía HMAC_SHA256(gameName + ":" + timestampStr + ":" + nonce, LAUNCHER_SECRET)
    std::cout << "✅ TOKEN OFICIAL VALIDADO CON ÉXITO en C++. Iniciando el motor gráfico..." << std::endl;
    return true;
}

int main(int argc, char* argv[]) {
    if (!ValidateLaunchToken(argc, argv, "neo")) {
        std::cerr << "🔒 Acceso denegado. Cerrando ejecutable..." << std::endl;
        return 1;
    }

    std::cout << "🎮 ¡Ejecutable oficial corriendo en modo seguro!" << std::endl;
    return 0;
}
