<template>
  <DataTable
    :title="`Nodes`"
    :headers="headers"
    :items="nodes"
    :on-click="onClick"
  >
    <template v-slot:item.action="{ item }">
      <v-btn
        small
        text
        color="primary"
        v-if="getNodeGroupId(item)"
        @click.stop="addNodeFromGroup(item)"
      >
        Add Similar
      </v-btn>
    </template>
  </DataTable>
</template>

<script lang="ts">
import { computed, inject, defineComponent } from "@nuxtjs/composition-api";
import DataTable from "./DataTable.vue";
import NodeStoreKey from "../../StoreKey/NodeStoreKey";
import NodeGroupStoreKey from "../../StoreKey/NodeGroupStoreKey";
import { V1Node, V1Taint } from "@kubernetes/client-node";
import {} from "../../lib/util";

export default defineComponent({
  components: {
    DataTable,
  },
  setup() {
    const nstore = inject(NodeStoreKey);
    if (!nstore) {
      throw new Error(`${NodeStoreKey.description} is not provided`);
    }
    
    const nodeGroupStore = inject(NodeGroupStoreKey);
    if (!nodeGroupStore) {
      throw new Error(`${NodeGroupStoreKey.description} is not provided`);
    }

    const nodes = computed(() => nstore.nodes);
    const onClick = (node: V1Node) => {
      nstore.select(node, false);
    };
    
    const getNodeGroupId = (node: V1Node) => {
      if (node.metadata?.labels && node.metadata.labels['nodegroup.simulator.k8s.io/id']) {
        return node.metadata.labels['nodegroup.simulator.k8s.io/id'];
      }
      return null;
    };
    
    const addNodeFromGroup = async (node: V1Node) => {
      const groupId = getNodeGroupId(node);
      if (groupId) {
        try {
          // Use the nodeGroupStore to create the node
          const newNode = nodeGroupStore.createNodeFromGroup(groupId);
          if (newNode) {
            await nstore.apply(newNode);
          } else {
            console.error("Failed to create node from group:", groupId);
          }
        } catch (error) {
          console.error("Error adding node from group:", error);
        }
      }
    };
    
    const search = "";
    const headers = [
      {
        text: "Name",
        value: "metadata.name",
        sortable: true,
      },
      {
        text: "Action",
        value: "action",
        sortable: false,
        align: "center",
        width: "100px",
      },
      { text: "CPU", value: "status.capacity.cpu", sortable: true },
      { text: "Memory", value: "status.capacity.memory", sortable: true },
      { text: "Pods", value: "status.capacity.pods", sortable: true },
      {
        text: "Node Group",
        value: "metadata.labels['nodegroup.simulator.k8s.io/id']",
        sortable: true,
        filter: (value: any) => {
          if (!value) return 'None';
          return value;
        },
      },
      {
        text: "Labels",
        value: "metadata.labels",
        sortable: false,
        filter: (value: any) => {
          if (!value) return '';
          return Object.entries(value)
            .filter(([k]) => k !== 'nodegroup.simulator.k8s.io/id') // Don't show our internal label
            .map(([k, v]) => `${k}=${v}`)
            .join(', ');
        },
      },
      {
        text: "Taints",
        value: "spec.taints",
        sortable: false,
        filter: (value: any) => {
          if (!value || !value.length) return '';
          return value
            .map((taint: any) => `${taint.key}${taint.value ? '=' + taint.value : ''}:${taint.effect}`)
            .join(', ');
        },
      },
      {
        text: "CreationTime",
        value: "metadata.creationTimestamp",
        sortable: true,
      },
    ];
    return {
      nodes,
      search,
      headers,
      onClick,
      getNodeGroupId,
      addNodeFromGroup
    };
  },
});
</script>
