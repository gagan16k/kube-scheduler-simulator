<template>
  <v-card class="ma-2" outlined>
    <v-card-title class="mb-1">
      <v-row>
        <v-col>
          Node Groups
          <v-spacer></v-spacer>
        </v-col>
      </v-row>
    </v-card-title>
    <v-card-text v-if="nodeGroups.length === 0">
      No node groups created yet. Use the "New Node Group" button to create one.
    </v-card-text>
    <v-card-text v-else>
      <v-expansion-panels>
        <v-expansion-panel
          v-for="group in nodeGroups"
          :key="group.id"
        >
          <v-expansion-panel-header>
            <div class="d-flex align-center" style="width: 100%;">
              <div class="d-flex align-center">
                <v-text-field
                  :value="editingPrefixes[group.id] !== undefined ? editingPrefixes[group.id] : group.prefix"
                  label="Prefix"
                  dense
                  hide-details
                  class="mr-2"
                  style="max-width: 150px;"
                  @click.stop=""
                  @input="onPrefixChange(group.id, $event)"
                  @keyup.enter="savePrefixChange(group.id)"
                ></v-text-field>
                <v-btn
                  x-small
                  icon
                  color="primary"
                  class="mr-2"
                  @click.stop="savePrefixChange(group.id)"
                  v-show="editingPrefixes[group.id] !== undefined && editingPrefixes[group.id] !== group.prefix"
                >
                  <v-icon small>mdi-content-save</v-icon>
                </v-btn>
              </div>
              <v-spacer></v-spacer>
              <v-btn
                small
                color="primary"
                class="mr-2"
                @click.stop="addNodeToGroup(group.id)"
              >
                Add Node
              </v-btn>
            </div>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-list dense>
              <v-list-item>
                <v-list-item-content>
                  <v-list-item-subtitle>CPU: {{ group.cpuValue }}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              <v-list-item>
                <v-list-item-content>
                  <v-list-item-subtitle>Memory: {{ group.memoryValue }}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              <v-list-item>
                <v-list-item-content>
                  <v-list-item-subtitle>Pods: {{ group.podsValue }}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              <v-list-item v-if="group.addLabels">
                <v-list-item-content>
                  <v-list-item-subtitle>Labels: {{ group.labelKey }}={{ group.labelValue }}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              <v-list-item v-if="group.addTaints">
                <v-list-item-content>
                  <v-list-item-subtitle>Taints: {{ group.taintKey }}{{ group.taintValue ? '=' + group.taintValue : '' }}:{{ group.taintEffect }}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { computed, inject, defineComponent, ref, reactive } from "@nuxtjs/composition-api";
import NodeGroupStoreKey from "./StoreKey/NodeGroupStoreKey";
import NodeStoreKey from "./StoreKey/NodeStoreKey";
import { NodeGroupConfig } from "../store/nodegroup";
import { V1Node, V1Taint } from "@kubernetes/client-node";
import { v4 as uuidv4 } from 'uuid';

export default defineComponent({
  setup() {
    const nodeGroupStore = inject(NodeGroupStoreKey);
    if (!nodeGroupStore) {
      throw new Error(`${NodeGroupStoreKey.description} is not provided`);
    }

    const nodeStore = inject(NodeStoreKey);
    if (!nodeStore) {
      throw new Error(`${NodeStoreKey.description} is not provided`);
    }

    const nodeGroups = computed(() => nodeGroupStore.nodeGroups);
    
    // Track edited prefixes
    const editingPrefixes = reactive<Record<string, string>>({});

    // Handle prefix changes
    const onPrefixChange = (groupId: string, newPrefix: string) => {
      editingPrefixes[groupId] = newPrefix;
    };

    // Save prefix change
    const savePrefixChange = (groupId: string) => {
      if (editingPrefixes[groupId]) {
        console.log('Saving prefix change:', groupId, editingPrefixes[groupId]);
        const success = nodeGroupStore.updateNodeGroupPrefix(groupId, editingPrefixes[groupId]);
        console.log('Prefix update success:', success);
        if (success) {
          console.log('Updated group:', nodeGroupStore.getNodeGroup(groupId));
          delete editingPrefixes[groupId];
        }
      }
    };

    const addNodeToGroup = async (groupId: string) => {
      try {
        console.log('Adding node to group by ID:', groupId);
        // Get the group configuration
        const group = nodeGroupStore.getNodeGroup(groupId);
        console.log('Group from store:', group);
        
        if (!group) {
          console.error("Group not found:", groupId);
          return;
        }
        
        // Create a new node using an object that matches exactly what's working in NodeGroupDialog.vue
        const node: V1Node = {
          kind: "Node",
          apiVersion: "v1",
          metadata: {
            generateName: `${group.prefix}-`,
            labels: {
              ...(group.addLabels ? { [group.labelKey]: group.labelValue } : {}),
              'nodegroup.simulator.k8s.io/id': group.id
            },
            annotations: {
              'simulator.kubernetes.io/price-per-hour': group.pricePerHour || '0.50'
            }
          },
          spec: group.addTaints ? {
            taints: [
              {
                key: group.taintKey,
                value: group.taintValue,
                effect: group.taintEffect
              } as V1Taint
            ]
          } : {},
          status: {
            capacity: {
              cpu: group.cpuValue,
              memory: group.memoryValue,
              pods: group.podsValue.toString()
            },
            allocatable: {
              cpu: group.cpuValue,
              memory: group.memoryValue,
              pods: group.podsValue.toString()
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
        
        // Clean up empty objects/arrays that might cause validation errors
        if (node.spec && Object.keys(node.spec).length === 0) {
          delete node.spec;
        }
        
        console.log('Created node object:', JSON.stringify(node));
        const result = await nodeStore.apply(node);
        console.log('Node apply result:', result);
      } catch (error) {
        console.error("Error adding node to group:", error);
      }
    };

    return {
      nodeGroups,
      addNodeToGroup,
      editingPrefixes,
      onPrefixChange,
      savePrefixChange
    };
  },
});
</script>