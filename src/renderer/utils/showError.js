import { ipcRenderer } from 'electron';
import { getMessages, getLocale } from '../../utils/i18n';

export const showError = (error, title) => {
    const locale = getLocale();
    const messages = getMessages(locale);
    
    // If error is just a string, we wrap it
    if (typeof error === 'string') {
        ipcRenderer.send('show-error', { 
            message: error, 
            title: title || messages.errorTitle || 'Application Error'
        });
    } else {
        const errorMsg = (error && typeof error === 'object' && error.message) ? error.message : (error ? error.toString() : 'Unknown error');
        const errorTitle = title || (error && typeof error === 'object' && error.title) || messages.errorTitle || 'Application Error';
        
        ipcRenderer.send('show-error', {
            message: errorMsg,
            title: errorTitle
        });
    }
};
