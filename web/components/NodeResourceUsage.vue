<template>
  <div class="node-resource-usage">
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <div 
          class="usage-icons" 
          v-bind="attrs"
          v-on="on"
        >
          <v-chip 
            class="usage-chip cpu-usage" 
            :color="getCpuColor(cpuUsagePercentage)" 
            x-small
            label
          >
            CPU: {{ Math.round(cpuUsagePercentage) }}%
          </v-chip>
          <v-chip 
            class="usage-chip memory-usage" 
            :color="getMemoryColor(memoryUsagePercentage)" 
            x-small
            label
          >
            MEM: {{ Math.round(memoryUsagePercentage) }}%
          </v-chip>
        </div>
      </template>
      <span>
        CPU: {{ cpuUsed }}m / {{ cpuTotal }}m ({{ Math.round(cpuUsagePercentage) }}%)<br>
        Memory: {{ formatMemory(memoryUsed) }} / {{ formatMemory(memoryTotal) }} ({{ Math.round(memoryUsagePercentage) }}%)
      </span>
    </v-tooltip>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, inject } from "@nuxtjs/composition-api";
import { V1Node, V1Pod } from "@kubernetes/client-node";
import PodStoreKey from "../components/StoreKey/PodStoreKey";

export default defineComponent({
  props: {
    node: {
      type: Object as () => V1Node,
      required: true,
    },
  },
  setup(props) {
    const podStore = inject(PodStoreKey);
    if (!podStore) {
      throw new Error(`PodStoreKey is not provided`);
    }

    // Get pods scheduled on this node
    const nodePods = computed(() => {
      const nodeName = props.node.metadata?.name;
      return nodeName ? podStore.pods[nodeName] || [] : [];
    });
    
    // Calculate CPU usage
    const cpuTotal = computed(() => {
      const cpuCapacity = props.node.status?.allocatable?.cpu;
      if (!cpuCapacity) return 0;
      
      // Handle different formats (e.g., "4" or "4000m")
      if (cpuCapacity.endsWith('m')) {
        return parseInt(cpuCapacity.slice(0, -1));
      }
      return parseInt(cpuCapacity) * 1000; // Convert cores to millicores
    });
    
    const cpuUsed = computed(() => {
      let totalCpuRequest = 0;
      nodePods.value.forEach(pod => {
        const containers = pod.spec?.containers || [];
        containers.forEach(container => {
          const cpuRequest = container.resources?.requests?.cpu;
          if (cpuRequest) {
            if (cpuRequest.endsWith('m')) {
              totalCpuRequest += parseInt(cpuRequest.slice(0, -1));
            } else {
              totalCpuRequest += parseInt(cpuRequest) * 1000; // Convert cores to millicores
            }
          }
        });
      });
      return totalCpuRequest;
    });
    
    const cpuUsagePercentage = computed(() => {
      return cpuTotal.value > 0 ? (cpuUsed.value / cpuTotal.value) * 100 : 0;
    });
    
    // Calculate memory usage
    const memoryTotal = computed(() => {
      const memoryCapacity = props.node.status?.allocatable?.memory;
      if (!memoryCapacity) return 0;
      
      // Convert to bytes for calculation
      return parseMemory(memoryCapacity);
    });
    
    const memoryUsed = computed(() => {
      let totalMemoryRequest = 0;
      nodePods.value.forEach(pod => {
        const containers = pod.spec?.containers || [];
        containers.forEach(container => {
          const memoryRequest = container.resources?.requests?.memory;
          if (memoryRequest) {
            totalMemoryRequest += parseMemory(memoryRequest);
          }
        });
      });
      return totalMemoryRequest;
    });
    
    const memoryUsagePercentage = computed(() => {
      return memoryTotal.value > 0 ? (memoryUsed.value / memoryTotal.value) * 100 : 0;
    });

    // Helper functions
    const parseMemory = (memory: string): number => {
      // Handle different formats: Ki, Mi, Gi
      if (!memory) return 0;
      
      let value = parseFloat(memory.replace(/[^0-9.]/g, ''));
      if (memory.endsWith('Ki')) {
        return value * 1024;
      } else if (memory.endsWith('Mi')) {
        return value * 1024 * 1024;
      } else if (memory.endsWith('Gi')) {
        return value * 1024 * 1024 * 1024;
      } else if (memory.endsWith('Ti')) {
        return value * 1024 * 1024 * 1024 * 1024;
      }
      return value;
    };
    
    const formatMemory = (bytes: number): string => {
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}Ki`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}Mi`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}Gi`;
    };
    
    const getCpuColor = (percentage: number): string => {
      if (percentage >= 90) return 'red';
      if (percentage >= 70) return 'orange';
      return 'green';
    };
    
    const getMemoryColor = (percentage: number): string => {
      if (percentage >= 90) return 'red';
      if (percentage >= 70) return 'orange';
      return 'green';
    };

    return {
      cpuTotal,
      cpuUsed,
      cpuUsagePercentage,
      memoryTotal,
      memoryUsed,
      memoryUsagePercentage,
      formatMemory,
      getCpuColor,
      getMemoryColor
    };
  },
});
</script>

<style scoped>
.node-resource-usage {
  display: inline-block;
}

.usage-icons {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.usage-chip {
  font-size: 10px;
  height: 20px !important;
  min-width: 60px;
}
</style>