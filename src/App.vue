<template>
    <div class="main-container">
        <aside class="patient-info-panel">
            <h2>患者信息</h2>
            <div class="file-loader">
                <button @click="handleFileSelectAndLoad">Open JSON File</button>
            </div>
            <div class="info-item">
                <span class="label">住院号:</span>
                <span class="value">{{ patientInfo.PatientId || '-' }}</span>
            </div>
            <div class="info-item">
                <span class="label">姓名:</span> <span class="value">{{ patientInfo.PatientName || '-' }}</span>
            </div>
            <div class="info-item">
                <span class="label">性别:</span>
                <span class="value">{{ formatSex(patientInfo.Sex) }}</span>
            </div>
            <div class="info-item">
                <span class="label">年龄:</span>
                <span class="value">{{ patientInfo.Age !== null ? patientInfo.Age : '-' }}</span>
            </div>
            <div class="info-item">
                <span class="label">身高:</span>
                <span class="value">{{ patientInfo.Height !== null ? `${patientInfo.Height} cm` : '-' }}</span>
            </div>
            <div class="info-item">
                <span class="label">体重:</span>
                <span class="value">{{ patientInfo.Weight !== null ? `${patientInfo.Weight} kg` : '-' }}</span>
            </div>
            <div class="info-item">
                <span class="label">诊断:</span>
                <span class="value">{{ patientInfo.DiagnosisName || '-' }}</span>
            </div>

            <div class="actions-panel">
                <button @click="saveModifiedData" 
                        :disabled="!dataLoaded || (!originalFilePath && !originalFileHandle)">
                    Save Modified Data
                </button>
            </div>
        </aside>

        <main class="measurements-panel">
            <h2>Measurement Data</h2>
            <div class="cards-container">
                <MeasurementCard 
                    v-for="measurement in selectData" 
                    :key="measurement.DataInfo.StartTime"  
                    :measurement-data="measurement"
                    @showDetails="openDetailWindow"
                    @isSuitableChanged="handleIsSuitableChange"
                />
                <div v-if="selectData.length === 0 && dataLoaded" class="no-data-message">
                    No measurement data found in the file, or the file is empty.
                </div>
                 <div v-if="!dataLoaded && selectData.length === 0" class="no-data-message">
                    Click "Open JSON File" to load data.
                </div>
            </div>

            <div class="detail-windows-area"> 
                <MeasurementDetailModal 
                    v-for="(windowData, index) in openDetailWindows"
                    :key="windowData.id"
                    :measurement="windowData.measurementData"
                    :window-id="windowData.id"
                    :z-index="windowData.zIndex" 
                    :initial-position="{ top: 20 + (openDetailWindows.filter(w=>w.id !== windowData.id && w.zIndex < windowData.zIndex).length % 5) * 30, left: 50 + (openDetailWindows.filter(w=>w.id !== windowData.id && w.zIndex < windowData.zIndex).length % 10) * 30 }"
                    @close="closeDetailWindow"
                    @bringToFront="bringToFront" 
                />
            </div>
        </main>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import MeasurementCard from './components/MeasurementCard.vue';
import MeasurementDetailModal from './components/MeasurementDetailModal.vue';

const defaultPatientInfo = () => ({
    Id: 0, PatientName: null, PatientId: null, VisitNumber: "", WardName: null,
    BedNo: null, Sex: null, Age: null, Height: null, Weight: null,
    DiagnosisCode: "", DiagnosisName: "", LastUpdateCode: "System",
    LastUpdateName: "System", LastUpdateDate: "", IsDeleted: false
});

const patientInfo = reactive({ ...defaultPatientInfo() });
const selectData = ref([]);
const dataLoaded = ref(false);
const originalFileHandle = ref(null); 
const originalFileNameFromHandle = ref(null); 
const originalFilePath = ref(null);

const openDetailWindows = ref([]); 
let nextZIndexCounter = ref(100); 

// --- IPC Listeners ---
const handleAppVersion = (version) => console.log('App Version:', version);
const handleMainMessage = (message) => console.log('Message from main:', message);
onMounted(() => { /* ... (IPC listeners setup) ... */ });
onBeforeUnmount(() => { /* ... (IPC listeners cleanup) ... */ });

function formatSex(sexCode) {
    if (sexCode === 1) return 'Male';
    if (sexCode === 0 || sexCode === 2) return 'Female'; 
    return '-'; 
}

async function handleFileSelectAndLoad() {
    let fileContentToProcess = null;
    let fileNameForSave = null;

    if (window.electronAPI && typeof window.electronAPI.openFile === 'function') {
        try {
            const result = await window.electronAPI.openFile();
            if (result && result.filePath && result.content) {
                originalFilePath.value = result.filePath; 
                fileNameForSave = result.filePath.split(/[/\\]/).pop();
                originalFileNameFromHandle.value = fileNameForSave; // Store filename for save dialog
                // originalFileHandle.value can be kept null if not used by Electron save
                fileContentToProcess = result.content;
            } else if (result === null) {
                 console.log('File open dialog was cancelled (Electron).');
                 return; // Do not proceed further
            }
        } catch (error) {
            console.error('Error opening file via Electron:', error);
            alert('Error opening file: ' + (error.message || error));
            resetUIDataOnLoadFailure();
            return;
        }
    } else if (window.showOpenFilePicker) { 
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] }}],
                multiple: false
            });
            originalFileHandle.value = fileHandle; // Store for FS API save if needed
            fileNameForSave = fileHandle.name;
            originalFileNameFromHandle.value = fileNameForSave;
            originalFilePath.value = fileHandle.name; // Path not directly available, use name as placeholder

            const file = await fileHandle.getFile();
            fileContentToProcess = await file.text();
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('File picker was cancelled by the user (FS API).');
            } else {
                console.error('Error picking file with FS API:', err);
                alert('Error picking file: ' + err.message);
            }
            return; // Do not proceed further
        }
    } else {
        alert('File access API not supported by this browser or environment.');
        return;
    }

    if (fileContentToProcess !== null) {
        processFileContent(fileContentToProcess);
        openDetailWindows.value = []; 
        nextZIndexCounter.value = 100; 
    }
}

function processFileContent(content) { /* ... (与之前版本相同) ... */
    try {
        const jsonData = JSON.parse(content);
        Object.assign(patientInfo, defaultPatientInfo());
        if (jsonData.PatientInfo) { 
            for (const key in patientInfo) {
                if (Object.prototype.hasOwnProperty.call(jsonData.PatientInfo, key)) {
                    if (jsonData.PatientInfo[key] !== null && jsonData.PatientInfo[key] !== undefined) {
                         patientInfo[key] = jsonData.PatientInfo[key];
                    }
                }
            }
            for (const keyInJson in jsonData.PatientInfo) {
                if (Object.prototype.hasOwnProperty.call(jsonData.PatientInfo, keyInJson) && !Object.prototype.hasOwnProperty.call(patientInfo, keyInJson)) {
                    patientInfo[keyInJson] = jsonData.PatientInfo[keyInJson];
                }
            }
        }
        patientInfo.LastUpdateDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
        selectData.value = jsonData.SelectData && Array.isArray(jsonData.SelectData) ? JSON.parse(JSON.stringify(jsonData.SelectData)) : [];
        dataLoaded.value = true;
    } catch (error) {
        console.error("Error parsing JSON content:", error);
        alert("Error parsing JSON file content. Please check the file format.");
        resetUIDataOnLoadFailure();
    }
}

function handleIsSuitableChange({ identifier, sortNo, isSuitable }) { /* ... (与之前版本相同) ... */
    const measurementToUpdate = selectData.value.find(m => m.DataInfo.StartTime === identifier && m.DataInfo.SortNo === sortNo);
    if (measurementToUpdate) {
        measurementToUpdate.DataInfo.IsSuitable = isSuitable;
        measurementToUpdate.DataInfo.LastUpdateDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    }
}

async function saveModifiedData() { /* ... (与之前版本相同, 使用 originalFilePath.value 或 originalFileNameFromHandle.value) ... */
    const currentOriginalPathForSave = originalFilePath.value || originalFileNameFromHandle.value;
    if (!dataLoaded.value || !currentOriginalPathForSave) {
        alert("No data loaded or original file reference is missing."); return;
    }
    const completePatientInfo = { ...patientInfo };
    completePatientInfo.LastUpdateDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const modifiedJsonData = { PatientInfo: completePatientInfo, SelectData: selectData.value };
    const jsonString = JSON.stringify(modifiedJsonData, null, 2);

    if (window.electronAPI && typeof window.electronAPI.saveFile === 'function') {
        try {
            // originalFilePath.value should be set by openFileViaElectron if using Electron IPC
            const result = await window.electronAPI.saveFile(originalFilePath.value, jsonString); 
            if (result && result.success) alert(`Data successfully saved as ${result.filePath}`);
            else if (result === null) console.log('Save file dialog was cancelled.');
            else alert('Failed to save file (main process reported an issue).');
        } catch (error) {
            console.error('Error saving file via Electron:', error);
            alert('Error saving file: ' + (error.message || error));
        }
    } else if (window.showSaveFilePicker && originalFileHandle.value) { // Fallback for browser FS API
        let baseName = originalFileNameFromHandle.value; // Use the name from the handle
        const extension = '.json';
        if (baseName.toLowerCase().endsWith(extension)) {
            baseName = baseName.substring(0, baseName.length - extension.length);
        }
        const newFileName = `${baseName}-modify${extension}`;
        try {
            const saveHandle = await window.showSaveFilePicker({
                suggestedName: newFileName,
                types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
            });
            const writable = await saveHandle.createWritable();
            await writable.write(jsonString);
            await writable.close();
            alert(`Data successfully saved as ${saveHandle.name}`);
        } catch (err) {
            if (err.name === 'AbortError') console.log('Save file dialog was cancelled by the user.');
            else {
                console.error('Error saving file with FS API:', err);
                alert('Error saving file: ' + err.message);
            }
        }
    } else {
         alert('File saving API not supported.');
    }
}

function resetUIDataOnLoadFailure() {
    Object.assign(patientInfo, defaultPatientInfo());
    selectData.value = [];
    dataLoaded.value = true; 
    originalFileHandle.value = null;
    originalFileNameFromHandle.value = null;
    originalFilePath.value = null;
    openDetailWindows.value = []; 
    nextZIndexCounter.value = 100;
}

function openDetailWindow(measurementData) {
    if (!measurementData?.DataInfo?.StartTime) {
        console.error("Cannot open detail window: Invalid measurement data", measurementData);
        return;
    }
    const windowId = measurementData.DataInfo.StartTime;
    const existingWindow = openDetailWindows.value.find(w => w.id === windowId);

    if (existingWindow) {
        bringToFront(windowId);
    } else {
        openDetailWindows.value.push({
            id: windowId,
            measurementData: measurementData,
            zIndex: nextZIndexCounter.value++,
        });
    }
}

function closeDetailWindow(windowIdToClose) {
    openDetailWindows.value = openDetailWindows.value.filter(w => w.id !== windowIdToClose);
}

function bringToFront(windowIdToFront) {
    const windowIndex = openDetailWindows.value.findIndex(w => w.id === windowIdToFront);
    if (windowIndex !== -1) {
        const windowInstance = openDetailWindows.value[windowIndex];
        windowInstance.zIndex = nextZIndexCounter.value++;
        // Vue 3 reactivity should handle re-ordering if items are sorted by zIndex,
        // or simply rely on browser stacking context for z-index.
        // Forcing a re-render of just that item might be tricky or unnecessary.
    }
}
</script>

<style>
@import './assets/style.css'; 

.detail-windows-area {
    position: fixed; 
    top: 0;
    left: 0;
    width: 100vw; /* 使用视口单位确保覆盖全屏 */
    height: 100vh;
    pointer-events: none; /* 允许点击穿透到主界面，除非点到实际的窗口 */
    z-index: 50; /* 确保这个区域在卡片之上，但在模态窗口之下 */
}

/* 其他 App.vue 样式保持不变 */
.actions-panel { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
.actions-panel button { padding: 10px 20px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; transition: background-color 0.2s ease-in-out; }
.actions-panel button:hover:not(:disabled) { background-color: #218838; }
.actions-panel button:disabled { background-color: #ccc; cursor: not-allowed; }
.file-loader button { padding: 10px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; width: calc(100% - 10px); margin: 0 5px 20px 5px; }
.file-loader button:hover { background-color: #0056b3; }
.no-data-message { width: 100%; text-align: center; padding: 20px; color: #777; font-style: italic; }
</style>