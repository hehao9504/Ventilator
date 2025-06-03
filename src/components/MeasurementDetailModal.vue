<template>
    <div class="detail-window-content" :style="windowStyle" @mousedown="handleMouseDownForDragAndFocus" @click.stop>
        <div class="window-header"> <span>详细数据 (记录 #{{ measurement?.DataInfo?.SortNo || 'N/A' }})</span>
            <button class="window-close-button" @click="closeWindow">&times;</button>
        </div>
        
        <div class="window-body">
            <div class="detail-section">
                <h4>参数信息 (按时间合并)</h4>
                <div v-if="groupedParamData.timestamps.length > 0" class="param-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th class="sticky-col first-col">参数类型</th>
                                <th class="sticky-col second-col">参数名称</th>
                                <th v-for="ts in groupedParamData.timestamps" :key="ts">
                                    {{ formatTime(ts) }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-if="groupedParamData.settingParams.length > 0">
                                <tr v-for="(paramName, index) in groupedParamData.settingParams" :key="`setting-${paramName}`">
                                    <td v-if="index === 0" :rowspan="groupedParamData.settingParams.length" class="param-type-cell sticky-col first-col">设置参数</td>
                                    <td class="sticky-col second-col param-name-cell">{{ paramName }}</td>
                                    <td v-for="ts in groupedParamData.timestamps" :key="`setting-${paramName}-${ts}`" class="value-cell">
                                        {{ groupedParamData.dataMatrix[paramName]?.[ts] || '-' }}
                                    </td>
                                </tr>
                            </template>
                             <template v-if="groupedParamData.monitoringParams.length > 0">
                                <tr v-for="(paramName, index) in groupedParamData.monitoringParams" :key="`monitoring-${paramName}`">
                                     <td v-if="index === 0" :rowspan="groupedParamData.monitoringParams.length" class="param-type-cell sticky-col first-col">监测参数</td>
                                    <td class="sticky-col second-col param-name-cell">{{ paramName }}</td>
                                    <td v-for="ts in groupedParamData.timestamps" :key="`monitoring-${paramName}-${ts}`" class="value-cell">
                                        {{ groupedParamData.dataMatrix[paramName]?.[ts] || '-' }}
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
                <p v-else>无参数数据可供表格显示。</p>
            </div>

            <div class="detail-section">
                <h4>波形数据 (WaveField)</h4>
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
        default: () => ({ DataInfo: {}, ParamField: [], WaveField: [] })
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

const isDragging = ref(false);
// 使用 ref 来管理位置，使其可响应式更新
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
    pointerEvents: 'auto', // 确保窗口可以接收自己的鼠标事件
}));

function closeWindow() {
    emit('close', props.windowId);
}

function handleMouseDownForDragAndFocus(event) {
    // 1. 将窗口置顶
    emit('bringToFront', props.windowId);

    // 2. 检查是否点击在可拖拽的头部区域
    let targetElement = event.target;
    let canDrag = false;
    while (targetElement && targetElement !== event.currentTarget) {
        if (targetElement.classList.contains('window-header')) {
            canDrag = true;
            break;
        }
        // 防止在可交互元素（如按钮、输入框、滚动条等）上启动拖拽
        if (targetElement.tagName === 'BUTTON' || targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || window.getComputedStyle(targetElement).overflowY === 'auto' || window.getComputedStyle(targetElement).overflowX === 'auto') {
            canDrag = false;
            break;
        }
        targetElement = targetElement.parentElement;
    }
    // 如果直接点击在 window-header 上
    if (event.target.classList.contains('window-header')) {
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
    }
}

function handleMouseMove(event) {
    if (isDragging.value) {
        let newLeft = event.clientX - dragStartOffset.value.x;
        let newTop = event.clientY - dragStartOffset.value.y;

        // 可选: 限制窗口不被拖出可视区域 (简单示例)
        // 需要知道父容器的尺寸，这里假设是整个窗口
        // const parentRect = (event.currentTarget as HTMLElement)?.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight, top: 0, left: 0 };
        // const elRect = (event.currentTarget as HTMLElement)?.getBoundingClientRect(); // 这个可能不是你想要的元素

        // 为了简单，暂时不加边界限制，或只限制不小于0
        newLeft = Math.max(0, newLeft);
        newTop = Math.max(0, newTop);
        // newLeft = Math.min(newLeft, window.innerWidth - 300); // 假设窗口宽度300
        // newTop = Math.min(newTop, window.innerHeight - 200); // 假设窗口高度200


        currentPosition.value = {
            left: newLeft,
            top: newTop,
        };
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
    // 清理全局事件监听器，防止内存泄漏
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
});


// formatTime 和 groupedParamData 计算属性 (与上一版本相同)
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

const groupedParamData = computed(() => {
    const paramField = props.measurement?.ParamField;
    if (!paramField || paramField.length === 0) {
        return { timestamps: [], settingParams: [], monitoringParams: [], dataMatrix: {} };
    }
    const timestampsSet = new Set();
    const dataMatrix = {}; 
    const paramTypes = {};
    paramField.forEach(group => {
        if (!group || !group.RecordTime || !Array.isArray(group.ItemData)) {
            console.warn('ParamField group 格式不正确:', group);
            return;
        }
        const recordTime = group.RecordTime;
        timestampsSet.add(recordTime);
        group.ItemData.forEach(item => {
            if (!item || !item.Name) {
                console.warn('ParamField item 格式不正确或缺少 Name:', item);
                return;
            }
            const paramType = item.Name.startsWith('SET_') ? 'setting' : 'monitoring';
            paramTypes[item.Name] = paramType;
            if (!dataMatrix[item.Name]) {
                dataMatrix[item.Name] = {};
            }
            dataMatrix[item.Name][recordTime] = item.Value;
        });
    });
    const sortedTimestamps = Array.from(timestampsSet).sort((a, b) => {
        const dateA = new Date(a).getTime(); const dateB = new Date(b).getTime();
        if (isNaN(dateA) || isNaN(dateB)) return 0;
        return dateA - dateB;
    });
    const settingParams = []; const monitoringParams = [];
    Object.keys(paramTypes).forEach(name => {
        if (paramTypes[name] === 'setting') settingParams.push(name);
        else monitoringParams.push(name);
    });
    const sortAlphabetically = (a, b) => a.localeCompare(b);
    settingParams.sort(sortAlphabetically);
    monitoringParams.sort(sortAlphabetically);
    return {
        timestamps: sortedTimestamps, settingParams, monitoringParams, dataMatrix
    };
});

</script>

<style scoped>
/* 样式与上一个回答中 MeasurementDetailModal.vue 的样式基本相同 */
/* 主要确保 .detail-window-content 是根元素并可定位 */
.detail-window-content {
    background-color: white;
    border: 1px solid #b0b0b0; /* 加深边框以便观察 */
    padding: 0; 
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2); /* 加深阴影 */
    width: 750px; /* 可以设置一个初始宽度 */
    height: 550px; /* 可以设置一个初始高度 */
    max-width: 90vw; /* 不超过视口宽度 */
    max-height: 85vh; /* 不超过视口高度 */
    display: flex;
    flex-direction: column;
    resize: both; 
    overflow: hidden; /* overflow: auto; 允许内容超出时滚动，但拖拽和resize时，hidden更好控制 */
    min-width: 400px; 
    min-height: 300px;
    pointer-events: auto; /* 确保窗口自身可以接收事件 */
}

.window-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px; /* 调整内边距 */
    background-color: #e8eef7; /* 浅蓝色头部 */
    border-bottom: 1px solid #ccc;
    border-top-left-radius: 7px; /* 匹配父元素圆角 */
    border-top-right-radius: 7px;
    cursor: move; 
    flex-shrink: 0; /* 防止头部被压缩 */
    user-select: none; /* 防止拖拽时选中文本 */
}
.window-header span {
    font-weight: bold;
    color: #333; /* 更改标题颜色 */
    font-size: 0.95em;
}

.window-close-button {
    background: none;
    border: none;
    font-size: 1.6em;
    line-height: 1;
    cursor: pointer;
    color: #666;
    padding: 0 5px;
}
.window-close-button:hover {
    color: #000;
}

.window-body {
    padding: 15px;
    overflow-y: auto; 
    overflow-x: hidden; /* 主体内容主要垂直滚动 */
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}


.detail-section {
    margin-bottom: 20px;
}
.detail-section:last-child {
    margin-bottom: 0;
}


.detail-section h4 {
    color: #0056b3;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 1.1em;
}

.param-table-container {
    overflow: auto; 
    max-height: 300px; /* 表格内容的最大高度 */
    /* border: 1px solid #e0e0e0; */ /* 可以移除，让window-body处理滚动条 */
    /* border-radius: 4px; */
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85em; 
}

th, td {
    border: 1px solid #ddd;
    padding: 6px 10px;
    text-align: left;
    white-space: nowrap; 
}
td.value-cell {
    text-align: center;
}

th {
    background-color: #f0f2f5;
    font-weight: bold;
    position: sticky; 
    top: 0;
    z-index: 2; 
}

.sticky-col {
    position: sticky;
    background-color: #f9f9f9; 
    z-index: 1;
}
.first-col {
    left: 0;
    width: 100px; 
    min-width: 100px;
}
.second-col {
    left: 100px; 
    width: 150px; 
    min-width: 150px;
}
th.first-col, th.second-col {
    z-index: 3; 
}

td.param-type-cell {
    font-weight: bold;
    text-align: center;
    vertical-align: middle;
}
td.param-name-cell {
    vertical-align: middle;
    font-weight: 500;
}

/* WaveField 部分的样式 */
.wave-group { margin-bottom: 15px; padding: 10px; border: 1px solid #f0f0f0; border-radius: 4px; background-color: #f9f9f9; }
.wave-group > strong { display: block; margin-bottom: 5px; color: #333; font-size: 1.05em; }
.wave-item { margin-bottom: 10px; }
.wave-item strong { display: block; margin-bottom: 3px; color: #555; font-size: 0.95em; }
.wave-data-area { width: 100%; height: 60px; font-family: monospace; font-size: 0.8em; padding: 5px; border: 1px solid #ddd; border-radius: 4px; background-color: #fff; resize: vertical; box-sizing: border-box; line-height: 1.4; color: #333; }
</style>