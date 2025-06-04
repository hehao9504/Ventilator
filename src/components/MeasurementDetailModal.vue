<template>
    <div
        class="detail-window-content"
        :style="windowStyle"
        @mousedown.left="handleMouseDown"
        @click.stop
    >
        <div class="window-header" ref="headerRef">
            <span>详细数据 (记录 #{{ measurement?.DataInfo?.SortNo || 'N/A' }})</span>
            <button class="window-close-button" @click="closeWindow">&times;</button>
        </div>

        <div class="window-body">
            <div class="detail-section">
                <h4>参数信息 (按时间合并)</h4>
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
                                <tr>
                                    <td :colspan="groupedParamData.timestamps.length + 1" class="param-category-header">设置参数</td>
                                </tr>
                                <tr v-for="paramConfig in groupedParamData.displayParams.setting" :key="`setting-${paramConfig.name}`">
                                    <td class="sticky-col first-col param-name-cell">{{ paramConfig.displayName }}</td>
                                    <td v-for="ts in groupedParamData.timestamps" :key="`setting-${paramConfig.name}-${ts}`" class="value-cell">
                                        {{ groupedParamData.dataMatrix[paramConfig.name]?.[ts] || '-' }}
                                    </td>
                                </tr>
                            </template>
                             <template v-if="groupedParamData.displayParams.monitoring.length > 0">
                                <tr>
                                    <td :colspan="groupedParamData.timestamps.length + 1" class="param-category-header">监测参数</td>
                                </tr>
                                <tr v-for="paramConfig in groupedParamData.displayParams.monitoring" :key="`monitoring-${paramConfig.name}`">
                                    <td class="sticky-col first-col param-name-cell">{{ paramConfig.displayName }}</td>
                                    <td v-for="ts in groupedParamData.timestamps" :key="`monitoring-${paramConfig.name}-${ts}`" class="value-cell">
                                        {{ groupedParamData.dataMatrix[paramConfig.name]?.[ts] || '-' }}
                                    </td>
                                </tr>
                            </template>
                             <template v-if="groupedParamData.displayParams.waveRelated.length > 0">
                                 <tr>
                                    <td :colspan="groupedParamData.timestamps.length + 1" class="param-category-header">波形数据参数</td>
                                </tr>
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
                <h4>原始波形数据 (WaveField)</h4>
                <p style="color: #888; font-style: italic;">（波形图表功能待后续实现）</p>
                <div v-if="measurement?.WaveField?.length">
                     <div v-for="(waveGroup, groupIndex) in measurement.WaveField" :key="`wave-group-${groupIndex}`" class="wave-group">
                        <strong>数据块记录时间: {{ formatTime(waveGroup.RecordTime) }}</strong>
                        <div v-for="(item, itemIndex) in waveGroup.ItemData" :key="`wave-item-${groupIndex}-${itemIndex}`" class="wave-item">
                            <strong>{{ item.Name }}:</strong>
                            <textarea readonly class="wave-data-area">{{ item.Value }}</textarea>
                        </div>
                    </div>
                </div>
                <p v-else>无波形数据。</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref, onBeforeUnmount } from 'vue';

const props = defineProps({
    measurement: {
        type: Object,
        required: true,
        default: () => ({ DataInfo: { SortNo: 'N/A'}, ParamField: [], WaveField: [] })
    },
    windowId: {
        type: [String, Number],
        required: true,
    },
    zIndex: {
        type: Number,
        default: 100
    },
    initialPosition: {
        type: Object,
        default: () => ({ top: 50, left: 50 })
    }
});

const emit = defineEmits(['close', 'bringToFront']);

const headerRef = ref(null);
const isDragging = ref(false);
const currentPosition = ref({
    top: props.initialPosition.top,
    left: props.initialPosition.left
});
const dragStartOffset = ref({ x: 0, y: 0 });

const windowStyle = computed(() => ({
    position: 'absolute',
    top: `${currentPosition.value.top}px`,
    left: `${currentPosition.value.left}px`,
    zIndex: props.zIndex,
    pointerEvents: 'auto',
}));

function closeWindow() {
    emit('close', props.windowId);
}

function handleMouseDown(event) {
    emit('bringToFront', props.windowId);
    let target = event.target;
    let canDrag = false;
    if (headerRef.value && headerRef.value.contains(target)) {
        if (target.tagName !== 'BUTTON') {
            canDrag = true;
        }
    }
    if (event.target === headerRef.value) {
        canDrag = true;
    }
    if (canDrag) {
        isDragging.value = true;
        dragStartOffset.value = {
            x: event.clientX - currentPosition.value.left,
            y: event.clientY - currentPosition.value.top,
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        event.preventDefault();
    }
}

function handleMouseMove(event) {
    if (isDragging.value) {
        let newLeft = event.clientX - dragStartOffset.value.x;
        let newTop = event.clientY - dragStartOffset.value.y;
        newLeft = Math.max(0, newLeft);
        newTop = Math.max(0, newTop);
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
    try {
        const timePart = dateTimeString.split(' ')[1];
        return timePart || dateTimeString;
    } catch (e) {
        console.warn("无法从日期时间字符串中解析时间:", dateTimeString, e);
        return dateTimeString;
    }
}

// ****** 根据您CSV/图片提供的参数列表，并请确保 'name' 字段与JSON数据中的键名一致 ******
const desiredParamsConfig = [
    // 设置参数
    { name: 'SET_OXYGEN', 	displayName: '氧浓度', 	 	type: 'setting' },
	{ name: 'SET_TV',  		displayName: '吸气压力', 	    type: 'setting' },
	{ name: 'SET_PINSP',	displayName: '吸气压力',  	type: 'setting' },
	{ name: 'SET_SIMVRR',	displayName: 'SIMV呼吸频率', 	type: 'setting' },
    { name: 'SET_RR',     	displayName: '呼吸频率',  	type: 'setting' }, 
    { name: 'SET_TINS',   	displayName: '吸气时间', 		type: 'setting' },
	{ name: 'SET_PEEP',   	displayName: '呼末正压', 		type: 'setting' },
    { name: 'SET_PSUPP',  	displayName: '支持压力',  	type: 'setting' },

    // 监测参数
    { name: 'PPEAK',      	displayName: '峰值压',       type: 'monitoring' },
    { name: 'PEAP',      	displayName: '呼末正压',   	type: 'monitoring' },
    { name: 'MVINSP',      	displayName: '分钟通气量', 	type: 'monitoring' },
    { name: 'VTE',        	displayName: '呼出潮气量',   	type: 'monitoring' },
    { name: 'RATE',       	displayName: '总频率',       type: 'monitoring' }, 

    // 波形数据参数 (假设这些是ParamField中的数值)
];
// ****** 结束重要修改区域 ******


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

</script>

<style scoped>
.detail-window-content {
    background-color: white;
    border: 1px solid #b0b0b0;
    padding: 0; 
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    width: 750px; 
    height: 550px; 
    max-width: 90vw;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    resize: both; 
    overflow: hidden;
    min-width: 400px; 
    min-height: 300px;
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

.param-table-container { overflow: auto; max-height: 300px; border: 1px solid #e0e0e0; border-radius: 4px; }
table { width: 100%; border-collapse: collapse; font-size: 0.85em;  table-layout: fixed; }
th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; white-space: nowrap; }
td.value-cell { text-align: center; overflow: hidden; text-overflow: ellipsis; }
th { background-color: #f0f2f5; font-weight: bold; position: sticky; top: 0; z-index: 2; }

/* 修改后的固定列样式 */
.sticky-col {
    position: sticky;
    background-color: #f9f9f9; 
    z-index: 1;
}
.first-col { /* 现在是 "参数名称" 列 */
    left: 0;
    width: 180px; /* 根据参数名称的长度调整 */
    min-width: 180px;
    max-width: 180px; 
    overflow: hidden;
    text-overflow: ellipsis;
}
/* .second-col 相关的样式已移除 */

th.first-col { /* 表头的 "参数名称" 列 */
    z-index: 3; 
}

/* .param-type-cell 样式已移除 */
td.param-name-cell { /* 这个类名仍然用于参数名称单元格 */
    vertical-align: middle;
    font-weight: 500;
}

/* 用于参数类别标题行的样式 (如果使用) */
.param-category-header {
    font-weight: bold;
    background-color: #e8e8e8;
    text-align: left;
    padding-left: 10px !important;
    font-style: italic;
    color: #333;
    /* z-index: 1; // 确保它在普通单元格之上，但在吸顶表头之下 */
    /* position: sticky; top: 0; // 如果希望类别标题也吸顶，但这会复杂化与列标题的吸顶 */
}


.wave-group { margin-bottom: 15px; padding: 10px; border: 1px solid #f0f0f0; border-radius: 4px; background-color: #f9f9f9; }
.wave-group > strong { display: block; margin-bottom: 5px; color: #333; font-size: 1.05em; }
.wave-item { margin-bottom: 10px; }
.wave-item strong { display: block; margin-bottom: 3px; color: #555; font-size: 0.95em; }
.wave-data-area { width: 100%; height: 60px; font-family: monospace; font-size: 0.8em; padding: 5px; border: 1px solid #ddd; border-radius: 4px; background-color: #fff; resize: vertical; box-sizing: border-box; line-height: 1.4; color: #333; }
</style>