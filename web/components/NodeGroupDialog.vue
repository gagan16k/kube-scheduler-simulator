<template>
  <v-dialog
    v-model="dialog"
    max-width="700px"
    persistent
  >
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        color="primary ma-2"
        dark
        v-bind="attrs"
        v-on="on"
      >
        New Node Group
      </v-btn>
    </template>
    <v-card>
      <v-card-title>
        <span class="headline">Create Node Group</span>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="prefix"
                label="Node Name Prefix"
                required
                hint="This will be used as prefix for all node names"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="count"
                label="Number of Nodes"
                type="number"
                min="1"
                required
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="cpuValue"
                label="CPU Capacity"
                required
                placeholder="4"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="pricePerHour"
                label="Price Per Hour ($)"
                type="number"
                step="0.01"
                min="0"
                hint="Cost per node per hour in USD"
                required
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <div class="d-flex align-center h-100">
                <v-chip color="success" class="px-2">
                  Total: ${{ (parseFloat(pricePerHour) * count).toFixed(2) }}/hr
                </v-chip>
              </div>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="memoryValue"
                label="Memory Capacity"
                required
                placeholder="32Gi"
                hint="Format: 32Gi, 4096Mi, etc."
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="podsValue"
                label="Pods Capacity"
                type="number"
                min="1"
                required
                placeholder="110"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-switch
                v-model="addTaints"
                label="Add Taints"
              ></v-switch>
            </v-col>
          </v-row>
          <v-row v-if="addTaints">
            <v-col cols="12">
              <v-text-field
                v-model="taintKey"
                label="Taint Key"
                required
                placeholder="dedicated"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="taintValue"
                label="Taint Value"
                placeholder="group-name"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="taintEffect"
                :items="taintEffects"
                label="Taint Effect"
                required
              ></v-select>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-switch
                v-model="addLabels"
                label="Add Labels"
              ></v-switch>
            </v-col>
          </v-row>
          <v-row v-if="addLabels">
            <v-col cols="6">
              <v-text-field
                v-model="labelKey"
                label="Label Key"
                required
                placeholder="node-group"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="labelValue"
                label="Label Value"
                required
                placeholder="group-name"
              ></v-text-field>
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
          @click="createNodes"
          :disabled="!isValid"
        >
          Create Node Group
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { ref, inject, computed, defineComponent } from "@nuxtjs/composition-api";
import NodeStoreKey from "./StoreKey/NodeStoreKey";
import NodeGroupStoreKey from "./StoreKey/NodeGroupStoreKey";
import { NodeGroupConfig } from "../store/nodegroup";
import { V1Node, V1Taint } from "@kubernetes/client-node";
import { v4 as uuidv4 } from 'uuid';

export default defineComponent({
  setup() {
    const nodestore = inject(NodeStoreKey);
    if (!nodestore) {
      throw new Error(`${NodeStoreKey.description} is not provided`);
    }
    
    const nodeGroupStore = inject(NodeGroupStoreKey);
    if (!nodeGroupStore) {
      throw new Error(`${NodeGroupStoreKey.description} is not provided`);
    }

    const dialog = ref(false);
    const prefix = ref('node-group-');
    const count = ref(0);
    const cpuValue = ref('4');
    const memoryValue = ref('32Gi');
    const podsValue = ref(110);
    const pricePerHour = ref('0.50');
    const addTaints = ref(false);
    const taintKey = ref('');
    const taintValue = ref('');
    const taintEffect = ref('NoSchedule');
    const taintEffects = ['NoSchedule', 'PreferNoSchedule', 'NoExecute'];
    const addLabels = ref(false);
    const labelKey = ref('');
    const labelValue = ref('');

    const isValid = computed(() => {
      if (!prefix.value || count.value < 0 || !cpuValue.value || !memoryValue.value || !podsValue.value) {
        return false;
      }
      if (addTaints.value && !taintKey.value) {
        return false;
      }
      if (addLabels.value && (!labelKey.value || !labelValue.value)) {
        return false;
      }
      return true;
    });



    const createNodes = async () => {
      try {
        // Save the node group configuration
        // Use UUID for the ID to ensure it's stable and independent of the prefix
        const nodeGroupId = uuidv4();
        
        const nodeGroupConfig: NodeGroupConfig = {
          id: nodeGroupId,
          prefix: prefix.value,
          cpuValue: cpuValue.value,
          memoryValue: memoryValue.value,
          podsValue: podsValue.value,
          addTaints: addTaints.value,
          taintKey: taintKey.value,
          taintValue: taintValue.value,
          taintEffect: taintEffect.value,
          addLabels: addLabels.value,
          labelKey: labelKey.value,
          labelValue: labelValue.value,
          pricePerHour: pricePerHour.value
          // count has been removed
        };
        
        nodeGroupStore.addNodeGroup(nodeGroupConfig);
        
        // Create multiple nodes based on the configuration
        for (let i = 0; i < count.value; i++) {
          const node: V1Node = {
            kind: "Node",
            apiVersion: "v1",
            metadata: {
              generateName: `${prefix.value}-`,
              labels: {
                ...(addLabels.value ? { [labelKey.value]: labelValue.value } : {}),
                'nodegroup.simulator.k8s.io/id': nodeGroupId
              },
              annotations: {
                'simulator.kubernetes.io/price-per-hour': pricePerHour.value
              }
            },
            spec: {
              taints: addTaints.value ? [
                {
                  key: taintKey.value,
                  value: taintValue.value,
                  effect: taintEffect.value
                } as V1Taint
              ] : undefined
            },
            status: {
              capacity: {
                cpu: cpuValue.value,
                memory: memoryValue.value,
                pods: podsValue.value.toString()
              },
              allocatable: {
                cpu: cpuValue.value,
                memory: memoryValue.value,
                pods: podsValue.value.toString()
              },
              phase: "Running",
              conditions: [
                {
                  type: "Ready",
                  status: "True"
                }
              ]
            }
          };
          
          await nodestore.apply(node);
        }
        
        // Close the dialog after node group creation
        dialog.value = false;
      } catch (error) {
        console.error("Error creating node group:", error);
      }
    };

    return {
      dialog,
      prefix,
      count,
      cpuValue,
      memoryValue,
      pricePerHour,
      podsValue,
      addTaints,
      taintKey,
      taintValue,
      taintEffect,
      taintEffects,
      addLabels,
      labelKey,
      labelValue,
      isValid,
      createNodes
    };
  }
});
</script>