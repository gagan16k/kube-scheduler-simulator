import { reactive } from "@nuxtjs/composition-api";
import { V1Node, V1Taint } from "@kubernetes/client-node";

// Define types for our node group
export interface NodeGroupConfig {
  id: string;
  prefix: string;
  cpuValue: string;
  memoryValue: string;
  podsValue: number;
  addTaints: boolean;
  taintKey: string;
  taintValue: string;
  taintEffect: string;
  addLabels: boolean;
  labelKey: string;
  labelValue: string;
  pricePerHour?: string; // Price per hour for each node
  count?: number; // Make count optional
}

type stateType = {
  nodeGroups: NodeGroupConfig[];
};

export default function nodeGroupStore() {
  const state: stateType = reactive({
    nodeGroups: [],
  });

  return {
    get nodeGroups() {
      return state.nodeGroups;
    },

    addNodeGroup(config: NodeGroupConfig) {
      state.nodeGroups.push(config);
    },

    getNodeGroup(id: string) {
      console.log('getNodeGroup called with id:', id);
      console.log('All groups:', state.nodeGroups);
      const group = state.nodeGroups.find(group => group.id === id);
      console.log('Found group:', group);
      return group;
    },

    removeNodeGroup(id: string) {
      const index = state.nodeGroups.findIndex(group => group.id === id);
      if (index !== -1) {
        state.nodeGroups.splice(index, 1);
      }
    },

    // Method removed: incrementNodeGroupCount
    
    updateNodeGroupPrefix(id: string, newPrefix: string) {
      console.log('Store updateNodeGroupPrefix called:', id, newPrefix);
      const group = this.getNodeGroup(id);
      console.log('Found group:', group);
      if (group) {
        console.log('Old prefix:', group.prefix);
        group.prefix = newPrefix;
        console.log('New prefix:', group.prefix);
        return true;
      }
      return false;
    },

    // Create a V1Node object from a node group configuration
    createNodeFromGroup(id: string): any {
      console.log('createNodeFromGroup called with id:', id);
      const group = this.getNodeGroup(id);
      console.log('Found group in createNodeFromGroup:', group);
      if (!group) {
        console.error('Group not found with id:', id);
        return null;
      }
      
      // Following the exact same pattern as in NodeGroupDialog which works
      const node: V1Node = {
        kind: "Node",
        apiVersion: "v1",
        metadata: {
          generateName: `${group.prefix}-`,
          labels: {
            ...(group.addLabels ? { [group.labelKey]: group.labelValue } : {}),
            'nodegroup.simulator.k8s.io/id': group.id
          }
        },
        spec: {
          taints: group.addTaints ? [
            {
              key: group.taintKey,
              value: group.taintValue,
              effect: group.taintEffect
            } as V1Taint
          ] : undefined
        },
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
      
      // Clean up undefined properties that might cause issues
      if (node.spec && !node.spec.taints) {
        delete node.spec.taints;
      }
      
      console.log('Final node object:', JSON.stringify(node));
      return node;
    }
  };
}