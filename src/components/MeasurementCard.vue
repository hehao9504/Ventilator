<template>
    <div class="measurement-card" @click="showDetails">
        <div class="card-header">
            <span class="sort-no">Record #{{ measurementData.DataInfo.SortNo || 'N/A' }}</span>
            <div class="suitability-status" @click.stop>
                <span :class="['status-indicator', localIsSuitable ? 'suitable-indicator' : 'unsuitable-indicator']"></span>
                <span :class="['suitability-text', localIsSuitable ? 'suitable' : 'unsuitable']">
                    {{ localIsSuitable ? 'Suitable' : 'Unsuitable' }}
                </span>
                <label class="switch">
                    <input type="checkbox" v-model="localIsSuitable" @change.stop="onSuitabilityChange">
                    <span class="slider round"></span>
                </label>
            </div>
        </div>
        <div class="card-body">
            <p class="data-row">
                <span class="label">Heart Rate (HR):</span>
                <span class="value">{{ measurementData.DataInfo.HR !== null ? measurementData.DataInfo.HR + ' bpm' : '-' }}</span>
            </p>
            <p class="data-row">
                <span class="label">SpO2:</span>
                <span class="value">{{ measurementData.DataInfo.SpO2 !== null ? measurementData.DataInfo.SpO2 + ' %' : '-' }}</span>
            </p>
            <p class="data-row">
                <span class="label">Blood Pressure (BP):</span>
                <span class="value">-</span>
            </p>
        </div>
        <div class="card-footer">
            <span>Start: {{ formatTime(measurementData.DataInfo.StartTime) }}</span>
            <span>End: {{ formatTime(measurementData.DataInfo.EndTime) }}</span>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';

const props = defineProps({
    measurementData: {
        type: Object,
        required: true
    }
});

// Emit 'isSuitableChanged' instead of 'update:isSuitable' for clarity
const emit = defineEmits(['isSuitableChanged', 'showDetails']);

const localIsSuitable = ref(props.measurementData.DataInfo.IsSuitable);

watch(() => props.measurementData.DataInfo.IsSuitable, (newValue) => {
    if (localIsSuitable.value !== newValue) {
        localIsSuitable.value = newValue;
    }
});

function formatTime(dateTimeString) {
    if (!dateTimeString) return '-';
    try {
        const timePart = dateTimeString.split(' ')[1];
        return timePart || '-';
    } catch (e) {
        console.warn("Could not parse time from:", dateTimeString);
        return '-';
    }
}

function onSuitabilityChange() {
    emit('isSuitableChanged', {
        // Use a unique identifier for the measurement, SortNo might not be unique across different loads if not careful
        // StartTime could be a more robust unique key for a given measurement record if SortNo isn't guaranteed unique globally
        identifier: props.measurementData.DataInfo.StartTime, // Or SortNo if it's reliably unique within a SelectData array
        sortNo: props.measurementData.DataInfo.SortNo, // Keep SortNo for easier debugging
        isSuitable: localIsSuitable.value
    });
    console.log(`Card Record ${props.measurementData.DataInfo.SortNo} IsSuitable changed to: ${localIsSuitable.value}`);
}

function showDetails() {
    emit('showDetails', props.measurementData);
}
</script>

<style scoped>

.measurement-card {
    background-color: #ffffff;
    border: 1px solid #d1d9e0;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    /* 默认情况下，每行排列 3 个卡片 */
    /* 父容器 .cards-container 的 gap 是 15px */
    /* 3个卡片之间有2个15px的间隙，总共30px */
    /* 这30px的间隙宽度需要从3个卡片的总宽度中扣除，平均每个卡片扣除 30px / 3 = 10px */
    width: calc(33.333% - 10px); 
    box-sizing: border-box;
    min-width: 280px; /* 卡片的最小宽度，如果容器太窄，可能会导致换行 */
    display: flex;
    flex-direction: column;
    cursor: pointer;	
}
.measurement-card:hover {
    border-color: #007bff;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
    margin-bottom: 10px;
}

.card-header .sort-no {
    font-weight: bold;
    font-size: 1.1em;
    color: #0056b3;
}

.card-header .suitability-status {
    display: flex;
    align-items: center;
    font-size: 0.9em;
}

.status-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 6px;
    display: inline-block;
}

.suitable-indicator {
    background-color: #4CAF50; /* Green */
}

.unsuitable-indicator {
    background-color: #f44336; /* Red */
}

.suitability-text {
    margin-right: 8px;
}
.suitable { color: green; }
.unsuitable { color: red; }

.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 20px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  transform: translateX(18px);
}

.card-body .data-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 8px 0;
    font-size: 0.95em;
}
.card-body .label {
    font-weight: 500;
    color: #444;
    margin-right: 10px;
}
.card-body .value {
    text-align: right;
    color: #333;
    font-weight: bold;
}

.card-footer {
    border-top: 1px solid #eee;
    padding-top: 10px;
    margin-top: auto;
    font-size: 0.85em;
    color: #666;
    display: flex;
    justify-content: space-between;
}

/*@media (max-width: 900px) {
    .measurement-card {
        width: calc(50% - 7.5px);
    }
}*/

@media (max-width: 768px) {
    .measurement-card {
        width: 100%;
    }
}
</style>