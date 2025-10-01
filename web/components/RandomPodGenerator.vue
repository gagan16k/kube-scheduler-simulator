<template>
  <v-dialog v-model="dialog" max-width="700px" persistent>
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        color="success ma-2"
        dark
        v-bind="attrs"
        v-on="on"
      >
        Random Pod
      </v-btn>
    </template>
    <v-card>
      <v-card-title>
        <span class="headline">Generate Random Pods</span>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model.number="podCount"
                label="Number of Pods"
                type="number"
                min="1"
                required
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="cpuMin"
                label="Min CPU Request"
                required
                placeholder="0.1"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="cpuMax"
                label="Max CPU Request"
                required
                placeholder="2"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="memoryMin"
                label="Min Memory Request (Mi)"
                type="number"
                required
                placeholder="64"
                hint="For multiples of 12Gi, ensure min value is at least 12288 (12Gi)"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="memoryMax"
                label="Max Memory Request (Mi)"
                type="number"
                required
                placeholder="512"
                hint="Values entered are in Mi"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-switch
                v-model="addTolerations"
                label="Add Tolerations"
              ></v-switch>
            </v-col>
          </v-row>
          <v-row v-if="addTolerations">
            <v-col cols="12">
              <v-text-field
                v-model="tolerationKey"
                label="Toleration Key"
                required
                placeholder="dedicated"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="tolerationValue"
                label="Toleration Value"
                placeholder="group-name"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="tolerationEffect"
                :items="tolerationEffects"
                label="Toleration Effect"
                required
              ></v-select>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="blue darken-1"
          text
          @click="dialog = false"
        >
          Cancel
        </v-btn>
        <v-btn
          color="blue darken-1"
          text
          @click="generateRandomPods"
          :disabled="!isValid"
        >
          Generate
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { ref, inject, computed, defineComponent } from "@nuxtjs/composition-api";
import PodStoreKey from "./StoreKey/PodStoreKey";
import { V1Pod, V1Container } from "@kubernetes/client-node";

export default defineComponent({
  setup() {
    const podStore = inject(PodStoreKey);
    if (!podStore) {
      throw new Error(`${PodStoreKey.description} is not provided`);
    }

    const dialog = ref(false);
    const podCount = ref(5);
    const cpuMin = ref("0.1");
    const cpuMax = ref("2");
    const memoryMin = ref(512);
    const memoryMax = ref(24576); // 24Gi in Mi
    const addTolerations = ref(false);
    const tolerationKey = ref('');
    const tolerationValue = ref('');
    const tolerationEffect = ref('NoSchedule');
    const tolerationEffects = ['NoSchedule', 'PreferNoSchedule', 'NoExecute'];

    const isValid = computed(() => {
      if (podCount.value < 1) return false;
      if (parseFloat(cpuMin.value) <= 0 || parseFloat(cpuMax.value) <= 0) return false;
      if (memoryMin.value <= 0 || memoryMax.value <= 0) return false;
      if (addTolerations.value && !tolerationKey.value) return false;
      return true;
    });

    // Function to generate random pods
    const generateRandomPods = async () => {
      try {
        const count = podCount.value;
        console.log(`Generating ${count} random pods`);
        
        const containerImages = [
          'nginx:latest', 
          'redis:alpine', 
          'busybox:latest', 
          'python:3.9-slim',
          'node:16-alpine',
          'httpd:alpine'
        ];
        
        // Generate random pods
        for (let i = 0; i < count; i++) {
          // Random resource values between min and max
          const cpuRequest = (Math.random() * (parseFloat(cpuMax.value) - parseFloat(cpuMin.value)) + parseFloat(cpuMin.value)).toFixed(2);
          
          // Generate memory request - can be either power of 2 or multiple of 12
          let memoryRequest;
          if (Math.random() > 0.5) {
            // Power of 2 (512Mi, 1Gi, 2Gi, 4Gi, 8Gi, etc.)
            const minPower = Math.ceil(Math.log2(memoryMin.value));
            const maxPower = Math.floor(Math.log2(memoryMax.value));
            const power = Math.floor(Math.random() * (maxPower - minPower + 1)) + minPower;
            const memoryValue = Math.pow(2, power);
            
            // Format memory value with appropriate unit (Mi or Gi)
            if (memoryValue >= 1024) {
              memoryRequest = `${(memoryValue / 1024).toFixed(0)}Gi`;
            } else {
              memoryRequest = `${memoryValue}Mi`;
            }
          } else {
            // Multiple of 12 Gi (12Gi, 24Gi, 36Gi, etc.)
            // Convert min/max from Mi to Gi for calculation
            const minGi = Math.ceil(memoryMin.value / 1024);
            const maxGi = Math.floor(memoryMax.value / 1024);
            
            // Calculate range for multiples of 12
            const minMultiple = Math.max(1, Math.ceil(minGi / 12));
            const maxMultiple = Math.max(1, Math.floor(maxGi / 12));
            
            // If range is too small, default to 12Gi
            if (minMultiple > maxMultiple) {
              memoryRequest = '12Gi';
            } else {
              const multiple = Math.floor(Math.random() * (maxMultiple - minMultiple + 1)) + minMultiple;
              memoryRequest = `${multiple * 12}Gi`;
            }
          }
          
          const randomImage = containerImages[Math.floor(Math.random() * containerImages.length)];
          const randomId = Math.floor(Math.random() * 10000);
          
          const pod: V1Pod = {
            kind: "Pod",
            apiVersion: "v1",
            metadata: {
              generateName: `random-pod-${randomId}-`,
              namespace: "default",
              labels: {
                app: `random-app-${Math.floor(Math.random() * 10)}`,
                'created-by': 'simulator',
              }
            },
            spec: {
              containers: [
                {
                  name: `container-${i}`,
                  image: randomImage,
                  resources: {
                    requests: {
                      cpu: cpuRequest,
                      memory: memoryRequest
                    },
                    limits: {
                      cpu: (parseFloat(cpuRequest) * 2).toFixed(2),
                      // Calculate memory limit based on the unit
                      memory: memoryRequest.endsWith('Gi') 
                        ? `${parseInt(memoryRequest) * 2}Gi` 
                        : `${parseInt(memoryRequest) * 2}Mi`
                    }
                  }
                } as V1Container
              ],
              // Don't specify nodeName to let the scheduler assign it
            }
          };
          
          // Add tolerations if configured
          if (addTolerations.value && tolerationKey.value) {
            pod.spec!.tolerations = [
              {
                key: tolerationKey.value,
                operator: "Equal",
                value: tolerationValue.value,
                effect: tolerationEffect.value
              }
            ];
          }
          
          await podStore.apply(pod);
          console.log(`Created random pod ${i+1}/${count}`);
        }
        
        // Close dialog after pods are created
        dialog.value = false;
      } catch (error) {
        console.error("Error generating random pods:", error);
      }
    };

    return {
      dialog,
      podCount,
      cpuMin,
      cpuMax,
      memoryMin,
      memoryMax,
      addTolerations,
      tolerationKey,
      tolerationValue,
      tolerationEffect,
      tolerationEffects,
      isValid,
      generateRandomPods
    };
  }
});
</script>