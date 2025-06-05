<template>
  <div class="chart-container" :style="{ height: chartHeight }">
    <Line v-if="chartDataGenerated.datasets.length > 0 && chartDataGenerated.datasets[0].data.length > 0" 
          :data="chartDataGenerated" 
          :options="chartOptionsRef" />
    <p v-else-if="!waveStringData || parsedWaveData.length === 0">数据为空或无效，无法生成图表。</p>
    <p v-else>图表加载中...</p>
  </div>
</template>

<script setup>
import { defineProps, computed, ref } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  LinearScale, // X 和 Y 轴都使用线性刻度
  PointElement,
  LineElement,
  Title,
  Tooltip,
} from 'chart.js';

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip
);

const props = defineProps({
  waveName: { type: String, default: 'Waveform' },
  waveStringData: { type: String, default: '' },
  chartHeight: { type: String, default: '250px' } // 默认图表高度
});

const parsedWaveData = computed(() => {
  if (!props.waveStringData) {
    return [];
  }
  const values = props.waveStringData.split('^').map(Number);
  return values.filter(v => !isNaN(v));
});

// X轴配置计算
const xAxisConfig = computed(() => {
  const numPoints = parsedWaveData.value.length;
  if (numPoints === 0) {
    return { min: 0, max: 500, stepSize: 1000 }; // 默认值
  }
  const xMax = Math.ceil(numPoints / 1000) * 1000;
  return {
    min: 0, // X轴从0开始 (或1，如果样本点从1计数)
    max: xMax < 1000 ? 1000 : xMax, // 确保X轴至少跨度到500，如果数据点很少
    stepSize: 1000
  };
});

// Y轴配置计算
const yAxisConfig = computed(() => {
  const values = parsedWaveData.value;

  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);

  const yMin = Math.floor(minVal / 100) * 100;
  const yMax = Math.ceil(maxVal / 100) * 100;
  
  if (yMax <= 100) {
	//yMax = Math.ceil(maxVal / 10) * 10;
    return { min: 0, max: Math.ceil(maxVal / 10) * 10, stepSize: 10 }; // 合理的默认值
  }
  
  return {
    min: yMin, // Y轴从最小值开始
    max: yMax, // 确保Y轴至少跨度到50，如果数据点很少
    stepSize: 100
  };

});


const chartDataGenerated = computed(() => {
  const values = parsedWaveData.value;
  if (values.length === 0) {
    return { datasets: [] }; // 返回空数据集结构以避免错误
  }
  
  // 为线性X轴准备数据格式：{x: sampleIndex, y: value}
  const dataPoints = values.map((val, index) => ({ x: index + 1, y: val })); 

  return {
    // labels 不再需要，因为X轴是线性的
    datasets: [
      {
        label: props.waveName,
        data: dataPoints, // 使用 {x, y} 数据点
        borderColor: '#1E88E5',
        backgroundColor: 'rgba(30, 136, 229, 0.05)',
        fill: true, 
        tension: 0.1, 
        pointRadius: 0, 
        borderWidth: 1.5,
      }
    ]
  };
});

const chartOptionsRef = computed(() => ({ 
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 },
  scales: {
    x: {
      type: 'linear', // X轴改为线性刻度
      title: { 
        display: true,
        text: '采样点序号',
        font: {size: 12}
      },
      min: xAxisConfig.value.min,
      max: xAxisConfig.value.max,
      ticks: { 
        stepSize: xAxisConfig.value.stepSize,
        font: {size: 10},
        autoSkip: false, // 线性轴通常会自动处理刻度密度
        // maxTicksLimit: Math.ceil(xAxisConfig.value.max / xAxisConfig.value.stepSize) + 1 
      },
      grid: { display: true, color: '#f0f0f0' }
    },
    y: {
      type: 'linear',
      min: yAxisConfig.value.min,
      max: yAxisConfig.value.max, 
      title: { 
        display: true, 
        text: '采样值', 
        font: {size: 12} 
      },
      ticks: {
        stepSize: yAxisConfig.value.stepSize, 
        callback: function(value) { return value.toFixed(0); },
        font: {size: 10},
		autoSkip: false,
        //count: 6, // 尝试强制6个刻度（5等分）
      },
      grid: { display: true, color: '#e0e0e0' }
    }
  },
  plugins: {
    legend: { display: false },
    title: {
      display: true,
      text: props.waveName,
      padding: { top: 5, bottom: 10 },
      font: { size: 14 }
    },
    tooltip: { enabled: true, mode: 'index', intersect: false, }
  },
  elements: { line: { borderWidth: 1.5 }, point: { radius: 0 } },
}));

</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%; 
  padding: 5px;
  box-sizing: border-box;
  background-color: #fff; 
  border: 1px solid #eee; 
  border-radius: 4px;
}
p { text-align: center; color: #777; margin-top: 20px; }
</style>