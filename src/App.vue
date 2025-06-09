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
            <div class="info-item">
                <span class="label">呼吸机类型:</span>
                <span class="value">{{ patientInfo.ventilatorType || '未知' }}</span>
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
				<template v-for="(windowData) in openDetailWindows" :key="windowData.id">
					<MeasurementDetailModal
						v-if="windowData && windowData.id != null"
						:measurement="windowData.measurementData"
						:window-id="windowData.id"
						:z-index="windowData.zIndex"
						:initial-position="windowData.position"
						@close="closeDetailWindow"
						@bringToFront="bringToFront"
						@toggle-minimize="handleToggleMinimize"
					/>
				</template>
            </div>
        </main>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import MeasurementCard from './components/MeasurementCard.vue';
import MeasurementDetailModal from './components/MeasurementDetailModal.vue';

const defaultPatientInfo = () => ({
    Id: 0,
    PatientName: null,
    PatientId: null,
    VisitNumber: "",
    WardName: null,
    BedNo: null,
    Sex: null,
    Age: null,
    Height: null,
    Weight: null,
    DiagnosisCode: "",
    DiagnosisName: "",
    LastUpdateCode: "System",
    LastUpdateName: "System",
    LastUpdateDate: "",
    IsDeleted: false,
	ventilatorType: '' // 新增字段，用于显示呼吸机类型
});

const patientInfo = reactive({ ...defaultPatientInfo() });
const selectData = ref([]);
const detailWindowRefs = ref({}); // <--- 添加这行

const dataLoaded = ref(false);
const originalFileHandle = ref(null); // For browser File System Access API
const originalFileNameFromHandle = ref(null); // For browser File System Access API & Electron
const originalFilePath = ref(null); // For Electron IPC

const openDetailWindows = ref([]);
let nextZIndexCounter = ref(100);
let openWindowCascadeCounter = 0;

// --- IPC Listeners (Example, if used) ---
const handleAppVersion = (version) => {
  console.log('App Version from main process:', version);
};
const handleMainMessage = (message) => {
    console.log('Message from main process:', message);
};

onMounted(() => {
  if (window.electronAPI) {
    window.electronAPI.onAppVersion?.(handleAppVersion); // Optional chaining for safety
    window.electronAPI.onMainProcessMessage?.(handleMainMessage);
  }
});

onBeforeUnmount(() => {
  if (window.electronAPI) {
    window.electronAPI.removeAppVersionListener?.(handleAppVersion);
    window.electronAPI.removeMainProcessMessageListener?.(handleMainMessage);
  }
});
// --- End IPC Listeners ---

function formatSex(sexCode) {
    if (sexCode === 1) return 'Male';
    if (sexCode === 0 || sexCode === 2) return 'Female';
    return '-';
}

// 新增：检测呼吸机类型的函数
function detectVentilatorType(paramFieldArray) {
    if (!paramFieldArray || paramFieldArray.length < 2) {
        console.warn("无法检测呼吸机类型：ParamField 数据不足或不存在。");
        return 'Unknown';
    }
    let fiveSecondIntervals = 0;
    let tenSecondIntervals = 0;
    const maxChecks = Math.min(3, paramFieldArray.length - 1);

    for (let i = 0; i < maxChecks; i++) {
        if (!paramFieldArray[i].RecordTime || !paramFieldArray[i+1].RecordTime) continue;
        try {
            const time1 = new Date(paramFieldArray[i].RecordTime).getTime();
            const time2 = new Date(paramFieldArray[i+1].RecordTime).getTime();
            if (isNaN(time1) || isNaN(time2)) {
                console.warn("无效的 RecordTime 格式:", paramFieldArray[i].RecordTime, paramFieldArray[i+1].RecordTime);
                continue;
            }
            const diffSeconds = Math.round(Math.abs(time2 - time1) / 1000);
            if (diffSeconds >= 4 && diffSeconds <= 6) fiveSecondIntervals++;
            else if (diffSeconds >= 9 && diffSeconds <= 11) tenSecondIntervals++;
        } catch (e) {
            console.error("解析 RecordTime 时出错:", e);
            continue;
        }
    }
    if (fiveSecondIntervals > 0 && fiveSecondIntervals >= tenSecondIntervals) return 'Comen';
    if (tenSecondIntervals > 0 && tenSecondIntervals > fiveSecondIntervals) return 'Mindray';
    console.warn("未能明确检测到呼吸机类型。5s间隔数:", fiveSecondIntervals, "10s间隔数:", tenSecondIntervals);
    return 'Unknown';
}


async function handleFileSelectAndLoad() {
    let fileContentToProcess = null;

    // 重置UI状态
    openDetailWindows.value = [];
    nextZIndexCounter.value = 100;
    openWindowCascadeCounter = 0;
    originalFilePath.value = null;
    originalFileNameFromHandle.value = null;
    originalFileHandle.value = null;
	detailWindowRefs.value = {}; // <--- 在这里添加


    if (window.electronAPI && typeof window.electronAPI.openFile === 'function') { // Electron 环境
        console.log("App.vue: Calling window.electronAPI.openFile()");
        try {
            const result = await window.electronAPI.openFile();
            console.log("App.vue: Result from electronAPI.openFile:", result);
            if (result && result.filePath && typeof result.content === 'string') {
                originalFilePath.value = result.filePath;
                originalFileNameFromHandle.value = result.filePath.split(/[/\\]/).pop();
                fileContentToProcess = result.content;
            } else if (result === null) {
                 console.log('App.vue: File open dialog was cancelled by user (Electron).');
                 return;
            } else if (result && result.error) { // 主进程返回了错误对象
                alert('Error opening file: ' + result.error);
                resetUIDataOnLoadFailure();
                return;
            }
             else {
                console.warn('App.vue: Unexpected or no result from electronAPI.openFile', result);
                alert('无法打开文件或未选择文件。');
                return;
            }
        } catch (error) {
            console.error('App.vue: Error calling electronAPI.openFile:', error);
            alert('与文件系统交互时出错: ' + (error.message || error));
            resetUIDataOnLoadFailure();
            return;
        }
    } else if (window.showOpenFilePicker) { // 浏览器 File System Access API (备用)
        console.log("App.vue: Using browser File System Access API");
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] }}],
                multiple: false
            });
            originalFileHandle.value = fileHandle;
            originalFileNameFromHandle.value = fileHandle.name;
            // 对于FS API，我们没有直接的“原始路径”用于保存回同目录，但可以用handle尝试
            const file = await fileHandle.getFile();
            fileContentToProcess = await file.text();
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('App.vue: File picker was cancelled by the user (FS API).');
            } else {
                console.error('App.vue: Error picking file with FS API:', err);
                alert('选择文件出错: ' + err.message);
            }
            return;
        }
    } else {
        alert('此环境不支持文件访问API。请在Electron或现代浏览器中运行。');
        return;
    }

    if (fileContentToProcess !== null) {
        processFileContent(fileContentToProcess);
    }
}

function processFileContent(content) {
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

        if (jsonData.SelectData && Array.isArray(jsonData.SelectData)) {
            selectData.value = jsonData.SelectData.map(measurement => {
                const enrichedMeasurement = JSON.parse(JSON.stringify(measurement));
                if (!enrichedMeasurement.DataInfo) enrichedMeasurement.DataInfo = {};
                enrichedMeasurement.DataInfo.ventilatorType = detectVentilatorType(enrichedMeasurement.ParamField);
                return enrichedMeasurement;
            });
			
			// 在处理完所有数据后，我们用第一条测量数据来检测整个文件的呼吸机类型，
			// 并将其赋值给主界面的 patientInfo 对象。
			if (selectData.value.length > 0 && selectData.value[0].ParamField) {
				patientInfo.ventilatorType = detectVentilatorType(selectData.value[0].ParamField);
			} else {
				patientInfo.ventilatorType = 'Unknown'; // 如果没有可供分析的数据
			}
        } else {
            selectData.value = [];
        }
        dataLoaded.value = true;
    } catch (error) {
        console.error("Error parsing JSON content:", error);
        alert("解析JSON文件内容出错，请检查文件格式。");
        resetUIDataOnLoadFailure();
    }
}

function handleIsSuitableChange({ identifier, sortNo, isSuitable }) {
    const measurementToUpdate = selectData.value.find(m => m.DataInfo.StartTime === identifier && m.DataInfo.SortNo === sortNo);
    if (measurementToUpdate) {
        measurementToUpdate.DataInfo.IsSuitable = isSuitable;
        measurementToUpdate.DataInfo.LastUpdateDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    }
}

async function saveModifiedData() {
    const currentOriginalPathForSave = originalFilePath.value || originalFileNameFromHandle.value;
    if (!dataLoaded.value || !currentOriginalPathForSave) {
        alert("没有加载数据或缺少原始文件参考。");
        return;
    }
    const completePatientInfo = { ...patientInfo };
    completePatientInfo.LastUpdateDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const modifiedJsonData = { PatientInfo: completePatientInfo, SelectData: selectData.value };
    
	// ✅ 使用紧凑格式保存 JSON 数据，避免额外空格导致体积膨胀
	const jsonString = JSON.stringify(modifiedJsonData); 
		
    if (window.electronAPI && typeof window.electronAPI.saveFile === 'function') {
        try {
            const result = await window.electronAPI.saveFile(originalFilePath.value, jsonString); // 传递原始完整路径
            if (result && result.success) alert(`数据已保存到 ${result.filePath}`);
            else if (result === null) console.log('Save file dialog was cancelled.');
            else if (result && result.error) alert('保存文件失败: ' + result.error);
            else alert('保存文件失败。');
        } catch (error) {
            console.error('Error saving file via Electron:', error);
            alert('保存文件出错: ' + (error.message || error));
        }
    } else if (window.showSaveFilePicker && originalFileHandle.value) {
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
            alert(`数据已保存为 ${saveHandle.name}`);
        } catch (err) { /* ...错误处理... */ }
    } else {
         alert('此环境不支持文件保存API。');
    }
}

function resetUIDataOnLoadFailure() {
    Object.assign(patientInfo, defaultPatientInfo());
    selectData.value = [];
    dataLoaded.value = true; // 标记为已尝试加载，即使失败
    originalFileHandle.value = null;
    originalFileNameFromHandle.value = null;
    originalFilePath.value = null;
    openDetailWindows.value = [];
    nextZIndexCounter.value = 100;
    openWindowCascadeCounter = 0;
	detailWindowRefs.value = {}; // <--- 在这里添加
}

function openDetailWindow(measurementData) {
    if (!measurementData?.DataInfo?.StartTime) {
        console.error("无法打开详情窗口: 无效的测量数据", measurementData);
        return;
    }
	
    const windowId = measurementData.DataInfo.StartTime;
    const existingWindow = openDetailWindows.value.find(w => w.id === windowId);

    if (existingWindow) {
        bringToFront(windowId);
		
		const windowComponentInstance = detailWindowRefs.value[existingWindow.id];
		if (windowComponentInstance) {
			windowComponentInstance.restoreWindow();
		}
    } else {
        const newZIndex = nextZIndexCounter.value++;
        const newPosition = {
            top: 50 + (openWindowCascadeCounter % 8) * 30, // 调整级联数量，避免过多重叠
            left: 50 + (openWindowCascadeCounter % 12) * 30
        };
        openWindowCascadeCounter++;

        openDetailWindows.value.push({
            id: windowId,
            measurementData: measurementData, // 包含 ventilatorType
            zIndex: newZIndex,
            position: newPosition,
			isMinimized: false
        });
    }
}

function handleToggleMinimize(windowId) {
    const windowToToggle = openDetailWindows.value.find(w => w.id === windowId);
    if (windowToToggle) {
        windowToToggle.isMinimized = !windowToToggle.isMinimized;
    }
}

function closeDetailWindow(windowIdToClose) {
    openDetailWindows.value = openDetailWindows.value.filter(w => w.id !== windowIdToClose);
    if (openDetailWindows.value.length === 0) {
        openWindowCascadeCounter = 0;
        // nextZIndexCounter.value = 100; // 可以不重置，让z-index持续增长
    }
}

function bringToFront(windowIdToFront) {
    const windowInstance = openDetailWindows.value.find(w => w.id === windowIdToFront);
    if (windowInstance) {
        windowInstance.zIndex = nextZIndexCounter.value++;
    }
}
</script>

<style>
@import './assets/style.css';

.detail-windows-area {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 50;
}
.actions-panel { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
.actions-panel button { padding: 10px 20px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; transition: background-color 0.2s ease-in-out; }
.actions-panel button:hover:not(:disabled) { background-color: #218838; }
.actions-panel button:disabled { background-color: #ccc; cursor: not-allowed; }
.file-loader button { padding: 10px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; width: calc(100% - 10px); margin: 0 5px 20px 5px; }
.file-loader button:hover { background-color: #0056b3; }
.no-data-message { width: 100%; text-align: center; padding: 20px; color: #777; font-style: italic; }
</style>