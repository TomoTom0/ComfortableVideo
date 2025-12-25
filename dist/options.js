"use strict";
function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        const messageEl = document.createElement('p');
        messageEl.className = 'confirm-dialog-message';
        messageEl.textContent = message;
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'confirm-dialog-buttons';
        const cancelButton = document.createElement('button');
        cancelButton.className = 'confirm-dialog-button confirm-dialog-button-cancel';
        cancelButton.textContent = chrome.i18n.getMessage('cancel') || 'キャンセル';
        const confirmButton = document.createElement('button');
        confirmButton.className = 'confirm-dialog-button confirm-dialog-button-confirm';
        confirmButton.textContent = chrome.i18n.getMessage('ok') || 'OK';
        cancelButton.addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
        confirmButton.addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);
        dialog.appendChild(messageEl);
        dialog.appendChild(buttonContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                resolve(false);
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
}
const defaultSettings = {
    hoverDetectionTime: 2000,
    controlsDisableTime: 3000,
    showInlineButton: true,
    pausedControlsEnabled: true,
    showContextMenu: true,
    showVideoContextMenu: true,
    enableYoutube: true,
    enablePrimeVideo: true,
    enableAllSites: true,
    exitButtonOpacity: 20
};
const elements = {
    hoverTime: document.getElementById('hoverTime'),
    hoverTimeValue: document.getElementById('hoverTimeValue'),
    disableTime: document.getElementById('disableTime'),
    disableTimeValue: document.getElementById('disableTimeValue'),
    showInlineButton: document.getElementById('showInlineButton'),
    pausedControlsEnabled: document.getElementById('pausedControlsEnabled'),
    showContextMenu: document.getElementById('showContextMenu'),
    showVideoContextMenu: document.getElementById('showVideoContextMenu'),
    enableYoutube: document.getElementById('enableYoutube'),
    enablePrimeVideo: document.getElementById('enablePrimeVideo'),
    enableAllSites: document.getElementById('enableAllSites'),
    exitButtonOpacity: document.getElementById('exitButtonOpacity'),
    exitButtonOpacityValue: document.getElementById('exitButtonOpacityValue'),
    saveButton: document.getElementById('saveButton'),
    resetButton: document.getElementById('resetButton')
};
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(defaultSettings);
        const settings = result;
        elements.hoverTime.value = settings.hoverDetectionTime.toString();
        const secondsUnit = chrome.i18n.getMessage('secondsUnit') || '秒';
        elements.hoverTimeValue.textContent = `${(settings.hoverDetectionTime / 1000).toFixed(1)}${secondsUnit}`;
        elements.disableTime.value = settings.controlsDisableTime.toString();
        elements.disableTimeValue.textContent = `${(settings.controlsDisableTime / 1000).toFixed(1)}${secondsUnit}`;
        elements.showInlineButton.checked = settings.showInlineButton;
        elements.pausedControlsEnabled.checked = settings.pausedControlsEnabled;
        elements.showContextMenu.checked = settings.showContextMenu;
        elements.showVideoContextMenu.checked = settings.showVideoContextMenu;
        elements.enableYoutube.checked = settings.enableYoutube;
        elements.enablePrimeVideo.checked = settings.enablePrimeVideo;
        elements.enableAllSites.checked = settings.enableAllSites;
        elements.exitButtonOpacity.value = settings.exitButtonOpacity.toString();
        const percentUnit = chrome.i18n.getMessage('percentUnit') || '%';
        elements.exitButtonOpacityValue.textContent = `${settings.exitButtonOpacity}${percentUnit}`;
    }
    catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
        showOptionsToast(chrome.i18n.getMessage('settingsLoadError'), 'error');
    }
}
async function saveSettings() {
    try {
        const settings = {
            hoverDetectionTime: parseInt(elements.hoverTime.value),
            controlsDisableTime: parseInt(elements.disableTime.value),
            showInlineButton: elements.showInlineButton.checked,
            pausedControlsEnabled: elements.pausedControlsEnabled.checked,
            showContextMenu: elements.showContextMenu.checked,
            showVideoContextMenu: elements.showVideoContextMenu.checked,
            enableYoutube: elements.enableYoutube.checked,
            enablePrimeVideo: elements.enablePrimeVideo.checked,
            enableAllSites: elements.enableAllSites.checked,
            exitButtonOpacity: parseInt(elements.exitButtonOpacity.value)
        };
        await chrome.storage.sync.set(settings);
        showOptionsToast(chrome.i18n.getMessage('settingsSaved'), 'success');
        try {
            chrome.runtime.sendMessage({
                action: 'updateContextMenus',
                settings
            });
        }
        catch (error) {
            console.error('バックグラウンドスクリプトへの通信に失敗しました:', error);
        }
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'settingsUpdated',
                    settings
                });
            }
        }
        catch (error) {
        }
    }
    catch (error) {
        console.error('設定の保存に失敗しました:', error);
        showOptionsToast(chrome.i18n.getMessage('settingsSaveError'), 'error');
    }
}
async function resetSettings() {
    try {
        await chrome.storage.sync.set(defaultSettings);
        await loadSettings();
        showOptionsToast(chrome.i18n.getMessage('settingsReset'), 'success');
    }
    catch (error) {
        console.error('設定のリセットに失敗しました:', error);
        showOptionsToast(chrome.i18n.getMessage('settingsResetError'), 'error');
    }
}
function showOptionsToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}
function updateSliderValues() {
    elements.hoverTime.addEventListener('input', () => {
        const value = parseInt(elements.hoverTime.value) / 1000;
        const unit = chrome.i18n.getMessage('secondsUnit') || '秒';
        elements.hoverTimeValue.textContent = `${value.toFixed(1)}${unit}`;
    });
    elements.disableTime.addEventListener('input', () => {
        const value = parseInt(elements.disableTime.value) / 1000;
        const unit = chrome.i18n.getMessage('secondsUnit') || '秒';
        elements.disableTimeValue.textContent = `${value.toFixed(1)}${unit}`;
    });
    elements.exitButtonOpacity.addEventListener('input', () => {
        const value = parseInt(elements.exitButtonOpacity.value);
        const unit = chrome.i18n.getMessage('percentUnit') || '%';
        elements.exitButtonOpacityValue.textContent = `${value}${unit}`;
    });
}
function setupEventListeners() {
    elements.saveButton.addEventListener('click', saveSettings);
    elements.resetButton.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog(chrome.i18n.getMessage('resetConfirm'));
        if (confirmed) {
            resetSettings();
        }
    });
    updateSliderValues();
}
function localizeUI() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            const message = chrome.i18n.getMessage(key);
            if (message) {
                if (element.tagName === 'INPUT' && element.type === 'button') {
                    element.value = message;
                }
                else {
                    element.textContent = message;
                }
            }
        }
    });
    document.title = chrome.i18n.getMessage('optionsTitle') || 'Comfortable Video - Options';
}
document.addEventListener('DOMContentLoaded', async () => {
    localizeUI();
    setupEventListeners();
    await loadSettings();
});
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        saveSettings();
    }
});
