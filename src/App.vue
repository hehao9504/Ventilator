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

            <div class="actions-panel">
                <button @click="saveModifiedData" :disabled="!dataLoaded || !originalFileHandle">Save Modified Data</button>
            </div>
        </aside>

        <main class="measurements-panel">
            <h2>Measurement Data</h2>
            <div class="cards-container">
                <MeasurementCard 
                    v-for="measurement in selectData" 
                    :key="measurement.DataInfo.StartTime"  
                    :measurement-data="measurement"
                    @showDetails="openDetailModal"
                    @isSuitableChanged="handleIsSuitableChange"
                />
                <div v-if="selectData.length === 0 && dataLoaded" class="no-data-message">
                    No measurement data found in the file, or the file is empty.
                </div>
                 <div v-if="!dataLoaded && selectData.length === 0" class="no-data-message">
                    Click "Open JSON File" to load data.
                </div>
            </div>
        </main>

        <MeasurementDetailModal 
            v-if="isDetailModalVisible"
            :measurement="selectedMeasurementForDetail"
            @close="closeDetailModal"
        />
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import MeasurementCard from './components/MeasurementCard.vue';
import MeasurementDetailModal from './components/MeasurementDetailModal.vue';

// 确保 defaultPatientInfo 包含所有期望的 PatientInfo 字段及其默认值
const defaultPatientInfo = () => ({
    Id: 0,
    PatientName: null,
    PatientId: null,
    VisitNumber: "",
    WardName: null,
    BedNo: null,
    Sex: null, // 使用 null 作为数字或未知状态的初始值
    Age: null, // 使用 null 作为数字的初始值
    Height: null, // 使用 null 作为数字的初始值
    Weight: null, // 使用 null 作为数字的初始值
    DiagnosisCode: "",
    DiagnosisName: "",
    LastUpdateCode: "System",
    LastUpdateName: "System",
    LastUpdateDate: "", // 将由程序在加载/保存时更新
    IsDeleted: false
});

const patientInfo = reactive({ ...defaultPatientInfo() });
const selectData = ref([]);
const dataLoaded = ref(false);
const originalFileHandle = ref(null); 
const originalFileNameFromHandle = ref(null); 

const isDetailModalVisible = ref(false);
const selectedMeasurementForDetail = ref(null);

function formatSex(sexCode) {
    if (sexCode === 1) return 'Male';
    if (sexCode === 0 || sexCode === 2) return 'Female'; // 假设0或2也可能是有效代码
    return '-'; // 如果 sexCode 是 null, undefined, 或其他未定义的值，显示 '-'
}

async function handleFileSelectAndLoad() {
    if (!window.showOpenFilePicker) {
        alert('Your browser does not support the File System Access API. Please use a modern browser like Chrome or Edge.');
        return;
    }
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] }}],
            multiple: false
        });
        originalFileHandle.value = fileHandle; 
        originalFileNameFromHandle.value = fileHandle.name; 

        const file = await fileHandle.getFile();
        processFile(file);

    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('File picker was cancelled by the user.');
        } else {
            console.error('Error picking file:', err);
            alert('Error picking file: ' + err.message);
        }
    }
}

function processFile(fileToLoad) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonData = JSON.parse(e.target.result);
            console.log("Original jsonData.PatientInfo from file:", JSON.stringify(jsonData.PatientInfo, null, 2)); // 调试点1

            // 1. 重置 patientInfo 为默认值
            Object.assign(patientInfo, defaultPatientInfo());

            // 2. 如果JSON数据中有PatientInfo，则用其更新响应式对象
            if (jsonData.PatientInfo) {
                for (const key in patientInfo) { // 遍历响应式对象的每一个key (它们来自defaultPatientInfo)
                    if (Object.prototype.hasOwnProperty.call(jsonData.PatientInfo, key)) {
                        // 如果加载的JSON的PatientInfo中也存在这个key (大小写匹配)
                        if (jsonData.PatientInfo[key] !== null && jsonData.PatientInfo[key] !== undefined) {
                             patientInfo[key] = jsonData.PatientInfo[key];
                        }
                        // 如果jsonData.PatientInfo[key]是null, patientInfo[key]将保持其来自defaultPatientInfo的null值
                    }
                }
                // 处理JSON中可能存在但defaultPatientInfo中未定义的额外字段 (可选，但有助于完整性)
                for (const keyInJson in jsonData.PatientInfo) {
                    if (Object.prototype.hasOwnProperty.call(jsonData.PatientInfo, keyInJson) && !Object.prototype.hasOwnProperty.call(patientInfo, keyInJson)) {
                        patientInfo[keyInJson] = jsonData.PatientInfo[keyInJson];
                    }
                }
            }
            
            patientInfo.LastUpdateDate = new Date().toISOString().replace('T', ' ').substring(0, 19); // 总是更新加载/处理时间
            console.log("Processed patientInfo state:", JSON.stringify(patientInfo, null, 2)); // 调试点2

            selectData.value = jsonData.SelectData && Array.isArray(jsonData.SelectData) ? JSON.parse(JSON.stringify(jsonData.SelectData)) : [];
            dataLoaded.value = true;
            
        } catch (error) {
            console.error("Error parsing JSON:", error);
            alert("Error parsing JSON file. Please check the file format.");
            resetUIDataOnLoadFailure(); 
        }
    };
    reader.onerror = () => {
        console.error("Error reading file:", reader.error);
        alert("Error reading file.");
        resetUIDataOnLoadFailure();
    };
    reader.readAsText(fileToLoad);
}

function handleIsSuitableChange({ identifier, sortNo, isSuitable }) {
    const measurementToUpdate = selectData.value.find(m => m.DataInfo.StartTime === identifier && m.DataInfo.SortNo === sortNo);
    if (measurementToUpdate) {
        measurementToUpdate.DataInfo.IsSuitable = isSuitable;
        measurementToUpdate.DataInfo.LastUpdateDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    } else {
        console.warn(`Could not find measurement with StartTime ${identifier} and SortNo ${sortNo} to update.`);
    }
}

async function saveModifiedData() {
    if (!dataLoaded.value || !originalFileHandle.value || !originalFileNameFromHandle.value) {
        alert("No data loaded or original file reference is missing. Please open a file first.");
        return;
    }
    if (!window.showSaveFilePicker) {
        alert('Your browser does not support the File System Access API for saving.');
        return;
    }

    const currentPatientInfoToSave = { ...patientInfo }; // 从响应式对象创建纯对象
    currentPatientInfoToSave.LastUpdateDate = new Date().toISOString().replace('T', ' ').substring(0, 19);


    const modifiedJsonData = {
        PatientInfo: currentPatientInfoToSave, // 使用当前patientInfo的状态
        SelectData: selectData.value 
    };

    const jsonString = JSON.stringify(modifiedJsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    let baseName = originalFileNameFromHandle.value;
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
        if (err.name === 'AbortError') {
            console.log('Save file dialog was cancelled by the user.');
        } else {
            console.error('Error saving file:', err);
            alert('Error saving file: ' + err.message);
        }
    }
}

function resetUIDataOnLoadFailure() {
    Object.assign(patientInfo, defaultPatientInfo());
    selectData.value = [];
    dataLoaded.value = true; 
    originalFileHandle.value = null;
    originalFileNameFromHandle.value = null;
    closeDetailModal();
}

function openDetailModal(measurement) {
    selectedMeasurementForDetail.value = measurement;
    isDetailModalVisible.value = true;
}

function closeDetailModal() {
    isDetailModalVisible.value = false;
    selectedMeasurementForDetail.value = null;
}
</script>

<style>
@import './assets/style.css'; 

.actions-panel {
    margin-top: 30px; /* 增加与上方信息的间距 */
    padding-top: 20px; /* 增加顶部内边距 */
    border-top: 1px solid #eee; /* 分隔线 */
    text-align: center;
}
.actions-panel button {
    padding: 10px 20px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.2s ease-in-out;
}
.actions-panel button:hover:not(:disabled) {
    background-color: #218838;
}
.actions-panel button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
}
.file-loader button {
    padding: 10px 15px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    width: calc(100% - 10px);
    margin: 0 5px;
}
.file-loader button:hover {
    background-color: #0056b3;
}
</style>