<template>
    <div class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
            <button class="modal-close-button" @click="closeModal">&times;</button>
            <h3>Detailed Data for Record #{{ measurement?.DataInfo?.SortNo || 'N/A' }}</h3>
            
            <div class="detail-section">
                <h4>Parameters (ParamField)</h4>
                <div v-if="measurement?.ParamField?.length">
                    <div v-for="(paramGroup, groupIndex) in measurement.ParamField" :key="`param-group-${groupIndex}`" class="param-group">
                        <strong>Record Time: {{ formatTime(paramGroup.RecordTime) }}</strong>
                        <ul>
                            <li v-for="(item, itemIndex) in paramGroup.ItemData" :key="`param-item-${groupIndex}-${itemIndex}`">
                                {{ item.Name }}: {{ item.Value }}
                            </li>
                        </ul>
                    </div>
                </div>
                <p v-else>No ParamField data available.</p>
            </div>

            <div class="detail-section">
                <h4>Waveforms (WaveField)</h4>
                <div v-if="measurement?.WaveField?.length">
                     <div v-for="(waveGroup, groupIndex) in measurement.WaveField" :key="`wave-group-${groupIndex}`" class="wave-group">
                        <strong>Record Time: {{ formatTime(waveGroup.RecordTime) }}</strong>
                        <div v-for="(item, itemIndex) in waveGroup.ItemData" :key="`wave-item-${groupIndex}-${itemIndex}`" class="wave-item">
                            <strong>{{ item.Name }}:</strong>
                            <textarea readonly class="wave-data-area">{{ item.Value }}</textarea>
                        </div>
                    </div>
                </div>
                <p v-else>No WaveField data available.</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
    measurement: {
        type: Object,
        default: () => ({ DataInfo: {}, ParamField: [], WaveField: [] }) // Provide a default structure
    }
});

const emit = defineEmits(['close']);

function closeModal() {
    emit('close');
}

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
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background-color: white;
    padding: 25px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    width: 80%;
    max-width: 900px;
    max-height: 85vh;
    overflow-y: auto;
    position: relative;
}

.modal-close-button {
    position: absolute;
    top: 10px;
    right: 15px;
    background: none;
    border: none;
    font-size: 1.8em;
    cursor: pointer;
    color: #888;
}
.modal-close-button:hover {
    color: #333;
}

.modal-content h3 {
    color: #0056b3;
    margin-top: 0;
    margin-bottom: 20px;
    text-align: center;
}

.detail-section {
    margin-bottom: 20px;
}

.detail-section h4 {
    color: #0056b3;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
    margin-bottom: 10px;
}

.param-group, .wave-group {
    margin-bottom: 15px;
    padding: 10px;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    background-color: #f9f9f9;
}
.param-group > strong, .wave-group > strong {
    display: block;
    margin-bottom: 5px;
    color: #333;
    font-size: 1.05em;
}

.param-group ul {
    list-style-type: none;
    padding-left: 10px;
    font-size: 0.9em;
}

.param-group ul li {
    margin-bottom: 3px;
    color: #444;
}

.wave-item {
    margin-bottom: 10px;
}
.wave-item strong {
    display: block; 
    margin-bottom: 3px;
    color: #555;
    font-size: 0.95em;
}

.wave-data-area {
    width: 100%;
    height: 80px; 
    font-family: monospace;
    font-size: 0.8em;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: #fff;
    resize: vertical; 
    box-sizing: border-box;
    line-height: 1.4;
    color: #333;
}
</style>