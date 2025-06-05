<template>
    <div
        class="detail-window-content"
        :style="windowStyle"
        @mousedown.left="handleMouseDown"
        @click.stop
    >
        <div class="window-header" ref="headerRef">
            <span>详细数据 (记录 #{{ measurement?.DataInfo?.SortNo || 'N/A' }}) - 类型: {{ measurement?.DataInfo?.ventilatorType || '未知' }}</span>
            <button class="window-close-button" @click="closeWindow">&times;</button>
        </div>

        <div class="window-body">
            <div class="detail-section">
                <h4>参数信息</h4>
                <div v-if="groupedParamData.timestamps.length > 0" class="param-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th class="sticky-col first-col">参数名称</th>
                                <th v-for="ts in groupedParamData.timestamps" :key="ts">
                                    {{ formatTime(ts) }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="groupedParamData.displayParams.setting.length > 0">
                                <tr> <td :colspan="groupedParamData.timestamps.length + 1" class="param-category-header">设置参数</td> </tr>
                                <tr v-for="paramConfig in groupedParamData.displayParams.setting" :key="`setting-${paramConfig.name}`">
                                    <td class="sticky-col first-col param-name-cell">{{ paramConfig.displayName }}</td>
                                    <td v-for="ts in groupedParamData.timestamps" :key="`setting-${paramConfig.name}-${ts}`" class="value-cell">
                                        {{ groupedParamData.dataMatrix[paramConfig.name]?.[ts] || '-' }}
                                    </td>
                                </tr>
                            </template>
                            <template v-if="groupedParamData.displayParams.monitoring.length > 0">
                                <tr> <td :colspan="groupedParamData.timestamps.length + 1" class="param-category-header">监测参数</td> </tr>
                                <tr v-for="paramConfig in groupedParamData.displayParams.monitoring" :key="`monitoring-${paramConfig.name}`">
                                    <td class="sticky-col first-col param-name-cell">{{ paramConfig.displayName }}</td>
                                    <td v-for="ts in groupedParamData.timestamps" :key="`monitoring-${paramConfig.name}-${ts}`" class="value-cell">
                                        {{ groupedParamData.dataMatrix[paramConfig.name]?.[ts] || '-' }}
                                    </td>
                                </tr>
                            </template>
                            <template v-if="groupedParamData.displayParams.waveRelated.length > 0">
                                 <tr> <td :colspan="groupedParamData.timestamps.length + 1" class="param-category-header">波形数据参数</td> </tr>
                                <tr v-for="paramConfig in groupedParamData.displayParams.waveRelated" :key="`waveRelated-${paramConfig.name}`">
                                    <td class="sticky-col first-col param-name-cell">{{ paramConfig.displayName }}</td>
                                    <td v-for="ts in groupedParamData.timestamps" :key="`waveRelated-${paramConfig.name}-${ts}`" class="value-cell">
                                        {{ groupedParamData.dataMatrix[paramConfig.name]?.[ts] || '-' }}
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
                <p v-else>无指定参数数据可供表格显示。</p>
            </div>

            <div class="detail-section">
                <h4>波形图 ({{ventilatorType}} WaveField)</h4>
                <div v-if="scaledVentPawWave.data" class="wave-chart-item">
                    <WaveformChart :wave-name="scaledVentPawWave.name" :wave-string-data="scaledVentPawWave.data" chart-height="200px" />
                    <p v-if="scaledVentPawWave.sampleRateInfo" class="wave-sample-rate">采样率参考: {{ scaledVentPawWave.sampleRateInfo }}</p>
                </div>
                <p v-else-if="hasAnyWaveFieldData && !scaledVentPawWave.data" class="wave-data-message">未找到 'Vent_Paw_Wave' 波形数据或数据为空。</p>

                <div v-if="scaledVentFlowWave.data" class="wave-chart-item">
                    <WaveformChart :wave-name="scaledVentFlowWave.name" :wave-string-data="scaledVentFlowWave.data" chart-height="200px" />
                     <p v-if="scaledVentFlowWave.sampleRateInfo" class="wave-sample-rate">采样率参考: {{ scaledVentFlowWave.sampleRateInfo }}</p>
                </div>
                <p v-else-if="hasAnyWaveFieldData && !scaledVentFlowWave.data" class="wave-data-message">未找到 'Vent_Flow_Wave' 波形数据或数据为空。</p>

                <div v-if="scaledVentVolWave.data" class="wave-chart-item">
                    <WaveformChart :wave-name="scaledVentVolWave.name" :wave-string-data="scaledVentVolWave.data" chart-height="200px" />
                    <p v-if="scaledVentVolWave.sampleRateInfo" class="wave-sample-rate">采样率参考: {{ scaledVentVolWave.sampleRateInfo }}</p>
                </div>
                <p v-else-if="hasAnyWaveFieldData && !scaledVentVolWave.data" class="wave-data-message">未找到 'Vent_Vol_Wave' 波形数据或数据为空。</p>

                <p v-if="!hasAnyWaveFieldData && !scaledVentPawWave.data && !scaledVentFlowWave.data && !scaledVentVolWave.data" class="wave-data-message">无波形数据。</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import WaveformChart from './WaveformChart.vue';
import { defineProps, defineEmits, computed, ref, onBeforeUnmount } from 'vue';

const props = defineProps({
    measurement: {
        type: Object,
        required: true,
        default: () => ({ DataInfo: { SortNo: 'N/A'}, ParamField: [], WaveField: [] })
    },
    windowId: { type: [String, Number], required: true },
    zIndex: { type: Number, default: 100 },
    initialPosition: { type: Object, default: () => ({ top: 50, left: 50 }) }
});
const emit = defineEmits(['close', 'bringToFront']);
const headerRef = ref(null);
const isDragging = ref(false);
const currentPosition = ref({ top: props.initialPosition.top, left: props.initialPosition.left });
const dragStartOffset = ref({ x: 0, y: 0 });
const windowStyle = computed(() => ({
    position: 'absolute',
    top: `${currentPosition.value.top}px`,
    left: `${currentPosition.value.left}px`,
    zIndex: props.zIndex,
    pointerEvents: 'auto',
}));
function closeWindow() { emit('close', props.windowId); }
function handleMouseDown(event) {
    emit('bringToFront', props.windowId);
    let target = event.target;
    let canDrag = false;
    if (headerRef.value && headerRef.value.contains(target) && target.tagName !== 'BUTTON') {
        canDrag = true;
    }
    if (event.target === headerRef.value) canDrag = true;
    if (canDrag) {
        isDragging.value = true;
        dragStartOffset.value = { x: event.clientX - currentPosition.value.left, y: event.clientY - currentPosition.value.top };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        event.preventDefault();
    }
}
function handleMouseMove(event) {
    if (isDragging.value) {
        let newLeft = event.clientX - dragStartOffset.value.x;
        let newTop = event.clientY - dragStartOffset.value.y;
        newLeft = Math.max(0, newLeft); newTop = Math.max(0, newTop);
        currentPosition.value = { left: newLeft, top: newTop };
    }
}
function handleMouseUp() {
    if (isDragging.value) {
        isDragging.value = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }
}
onBeforeUnmount(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
});
function formatTime(dateTimeString) {
    if (!dateTimeString) return '-';
    try { return dateTimeString.split(' ')[1] || dateTimeString; }
    catch (e) { return dateTimeString; }
}
const desiredParamsConfig = [
    { name: 'SET_OXYGEN', 	displayName: '氧浓度',       type: 'setting' },
	{ name: 'SET_TV', 		displayName: '潮气量',       type: 'setting' },	
	{ name: 'SET_PINSP',  	displayName: '吸气压力',     type: 'setting' },
	{ name: 'SET_SIMVRR', 	displayName: 'SIMV呼吸频率',	type: 'setting' },
    { name: 'SET_RR',     	displayName: '呼吸频率', 	    type: 'setting' },
	{ name: 'SET_TINS',   	displayName: '吸气时间',		type: 'setting' },	
	{ name: 'SET_PEEP',   	displayName: '呼末正压',  	type: 'setting' },

    { name: 'PPEAK',      	displayName: '峰值压',		type: 'monitoring'},
    { name: 'PEAP',      	displayName: '呼末正压',		type: 'monitoring'},
    { name: 'MVE', 			displayName: '分钟通气量', 	type: 'monitoring' },
    { name: 'VTE',        	displayName: '呼出潮气量',   	type: 'monitoring' },
    { name: 'RATE',       	displayName: '总频率',  	type: 'monitoring' }
];
const groupedParamData = computed(() => {
    const paramField = props.measurement?.ParamField;
    if (!paramField || paramField.length === 0) {
        return { timestamps: [], displayParams: { setting: [], monitoring: [], waveRelated: [] }, dataMatrix: {} };
    }
    const timestampsSet = new Set();
    const dataMatrix = {};
    paramField.forEach(group => {
        if (!group || !group.RecordTime || !Array.isArray(group.ItemData)) return;
        const recordTime = group.RecordTime;
        timestampsSet.add(recordTime);
        group.ItemData.forEach(item => {
            if (!item || !item.Name) return;
            if (!dataMatrix[item.Name]) dataMatrix[item.Name] = {};
            dataMatrix[item.Name][recordTime] = item.Value;
        });
    });
    const sortedTimestamps = Array.from(timestampsSet).sort((a, b) => {
        const dateA = new Date(a).getTime(); const dateB = new Date(b).getTime();
        if (isNaN(dateA) || isNaN(dateB)) return 0;
        return dateA - dateB;
    });
    const displayParams = { setting: [], monitoring: [], waveRelated: [] };
    desiredParamsConfig.forEach(config => {
        if (dataMatrix[config.name]) {
            if (config.type === 'setting') displayParams.setting.push(config);
            else if (config.type === 'monitoring') displayParams.monitoring.push(config);
            else if (config.type === 'waveRelated') displayParams.waveRelated.push(config);
        }
    });
    return { timestamps: sortedTimestamps, displayParams, dataMatrix };
});

const hasAnyWaveFieldData = computed(() => {
    return props.measurement?.WaveField?.length > 0 &&
           props.measurement.WaveField.some(wfBlock => wfBlock.ItemData && wfBlock.ItemData.length > 0);
});

function scaleWaveValues(waveValueString, ventilatorType, waveNameKey) {
    if (!waveValueString || typeof waveValueString !== 'string') return '';
    let divisor = 1; let precision = 0;
    if (ventilatorType === 'Mindray') {
        if (waveNameKey === 'Vent_Flow_Wave') { divisor = 10; precision = 1; }
        else if (waveNameKey === 'Vent_Paw_Wave') { divisor = 100; precision = 2; }
        else if (waveNameKey === 'Vent_Vol_Wave') { divisor = 10; precision = 1; }
    } else if (ventilatorType === 'Comen') {
        if (waveNameKey === 'Vent_Flow_Wave') { divisor = 1; precision = 2; }
        else if (waveNameKey === 'Vent_Paw_Wave') { divisor = 100; precision = 2; }
        else if (waveNameKey === 'Vent_Vol_Wave') { divisor = 100; precision = 0; }
    }
    if (divisor === 1 && precision === 0 && ventilatorType !== 'Unknown') return waveValueString;
    if (ventilatorType === 'Unknown') return waveValueString;
    return waveValueString.split('^').map(valStr => {
        const numVal = parseFloat(valStr);
        if (isNaN(numVal)) return valStr;
        const scaledVal = numVal / divisor;
        return precision > 0 ? scaledVal.toFixed(precision) : Math.round(scaledVal).toString();
    }).join('^');
}

function getConcatenatedAndScaledWaveData(waveNameKey) {
    const ventilatorType = props.measurement?.DataInfo?.ventilatorType || 'Unknown';
    const sampleRateNameKey = `${waveNameKey}_Sample`;
    const waveDisplayName = `${waveNameKey}`;
    if (!hasAnyWaveFieldData.value) return { name: waveDisplayName, data: null, sampleRateInfo: null };
    const waveSegments = [];
    props.measurement.WaveField.forEach(waveBlock => {
        if (waveBlock && Array.isArray(waveBlock.ItemData) && waveBlock.RecordTime) {
            const waveDataItem = waveBlock.ItemData.find(item => item.Name === waveNameKey);
            if (waveDataItem && typeof waveDataItem.Value === 'string' && waveDataItem.Value.trim() !== '') {
                let segmentSampleRate = 200;
                const sampleItem = waveBlock.ItemData.find(item => item.Name === sampleRateNameKey);
                if (sampleItem && !isNaN(parseInt(sampleItem.Value, 10))) segmentSampleRate = parseInt(sampleItem.Value, 10);
                else {
                    const genericSampleItem = waveBlock.ItemData.find(item => item.Name && item.Name.endsWith('_Sample'));
                    if (genericSampleItem && !isNaN(parseInt(genericSampleItem.Value, 10))) segmentSampleRate = parseInt(genericSampleItem.Value, 10);
                }
                const scaledWaveValue = scaleWaveValues(waveDataItem.Value, ventilatorType, waveNameKey);
                waveSegments.push({ recordTime: waveBlock.RecordTime, waveValue: scaledWaveValue, sampleRate: segmentSampleRate });
            }
        }
    });
    if (waveSegments.length === 0) return { name: waveDisplayName, data: null, sampleRateInfo: `无 ${waveNameKey} 数据` };
    waveSegments.sort((a, b) => new Date(a.recordTime).getTime() - new Date(b.recordTime).getTime());
    const concatenatedData = waveSegments.map(segment => segment.waveValue).join('^');
    let representativeSampleRateInfo = "未指定";
    if (waveSegments.length > 0 && waveSegments[0].sampleRate !== null) {
        const firstSampleRate = waveSegments[0].sampleRate;
        const allSameRate = waveSegments.every(s => s.sampleRate === firstSampleRate);
        if (allSameRate) representativeSampleRateInfo = `${firstSampleRate} Hz`;
        else {
            const rates = waveSegments.map(s => s.sampleRate).filter(r => r !== null);
            if (rates.length > 0) {
                const minRate = Math.min(...rates); const maxRate = Math.max(...rates);
                representativeSampleRateInfo = `多段 (${minRate === maxRate ? minRate : minRate + '-' + maxRate} Hz)`;
            } else representativeSampleRateInfo = "多段 (采样率未知)";
        }
    }
    return { name: waveDisplayName, data: concatenatedData, sampleRateInfo: representativeSampleRateInfo };
}

const scaledVentPawWave = computed(() => getConcatenatedAndScaledWaveData('Vent_Paw_Wave'));
const scaledVentFlowWave = computed(() => getConcatenatedAndScaledWaveData('Vent_Flow_Wave'));
const scaledVentVolWave = computed(() => getConcatenatedAndScaledWaveData('Vent_Vol_Wave'));
</script>

<style scoped>
.detail-window-content { 
	background-color: white; 
	border: 1px solid #b0b0b0; 
	padding: 0; 
	border-radius: 8px; 
	box-shadow: 0 5px 15px rgba(0,0,0,0.2); 
	width: 1000px; 
	height: 1200px; 
	max-width: 95vw; 
	max-height: 90vh; 
	display: flex; 
	flex-direction: column; 
	resize: both; 
	overflow: hidden; 
	min-width: 500px; 
	min-height: 500px; 
	pointer-events: auto; 
	}
	
.window-header { 
	display: flex; 
	justify-content: space-between; 
	align-items: center; 
	padding: 8px 12px; 
	background-color: #e8eef7; 
	border-bottom: 1px solid #ccc; 
	border-top-left-radius: 7px; 
	border-top-right-radius: 7px; 
	cursor: move; 
	flex-shrink: 0; 
	user-select: none; 
	}
	
.window-header span { font-weight: bold; color: #333; font-size: 0.95em; }
.window-close-button { background: none; border: none; font-size: 1.6em; line-height: 1; cursor: pointer; color: #666; padding: 0 5px; }
.window-close-button:hover { color: #000; }
.window-body { padding: 15px; overflow-y: auto; overflow-x: hidden; flex-grow: 1; display: flex; flex-direction: column; }

.detail-section { margin-bottom: 20px; }
.detail-section:last-child { margin-bottom: 0; }
.detail-section h4 { color: #0056b3; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 0; margin-bottom: 10px; font-size: 1.1em; }
.param-table-container { overflow: auto; max-height: 600px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 15px; }
table { width: 100%; border-collapse: collapse; font-size: 0.85em;  table-layout: fixed; }
th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: center; white-space: nowrap; }
td.value-cell { text-align: center; overflow: hidden; text-overflow: ellipsis; }
th { background-color: #f0f2f5; font-weight: bold; position: sticky; top: 0; z-index: 2; }
.sticky-col { position: sticky; background-color: #f9f9f9; z-index: 1;}
.first-col { left: 0; width: 100px; min-width: 180px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
th.first-col { z-index: 3; }
td.param-name-cell { vertical-align: middle; font-weight: 500; }
.param-category-header { font-weight: bold; background-color: #e8e8e8; text-align: center; padding-left: 10px !important; font-style: italic; color: #333; position: sticky; top: 28px; z-index: 1; }
.wave-data-block { margin-bottom: 10px; }
.wave-chart-item { border: 1px solid #e0e0e0; padding: 10px; border-radius: 4px; margin-top: 10px; background-color: #fdfdfd; min-height: 220px; }
.wave-sample-rate { font-size: 0.8em; color: #777; margin-top: 4px; text-align: right; }
.wave-data-message { color: #888; font-style: italic; text-align: center; padding: 10px; }
</style>