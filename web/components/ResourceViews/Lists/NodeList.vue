<template>
  <div>
    <!-- Total Node Price Card -->
    <NodeTotalPrice />
    
    <!-- Node List Card -->
    <v-card v-if="nodes.length !== 0" class="ma-2" outlined>
      <v-card-title class="mb-1"> Nodes </v-card-title>
      <v-container>
        <v-row no-gutters>
          <v-col v-for="(n, i) in nodes" :key="i" tile cols="auto">
            <v-card class="ma-2 position-relative" outlined @click="onClick(n)">
              <div class="d-flex flex-column">
                <div class="d-flex justify-space-between align-center">
                  <v-card-title class="py-2">
                    <img
                      src="/node.svg"
                      height="40"
                      alt="p.metadata.name"
                      class="mr-2"
                    />
                    <span class="node-name-truncate">{{ n.metadata.name }}</span>
                  </v-card-title>
                  <div class="mr-3">
                    <NodeResourceUsage :node="n" />
                  </div>
                </div>
                <!-- Node price display -->
                <div class="px-4 pb-2" v-if="getNodePrice(n)">
                  <v-chip x-small label color="success">
                    ${{ getNodePrice(n) }}/hr
                  </v-chip>
                </div>
                <PodList :node-name="n.metadata.name" />
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-card>
  </div>
</template>

<script lang="ts">
import { computed, inject, defineComponent } from "@nuxtjs/composition-api";
import NodeStoreKey from "../../StoreKey/NodeStoreKey";
import PodList from "./PodList.vue";
import NodeResourceUsage from "../../NodeResourceUsage.vue";
import NodeTotalPrice from "../../NodeTotalPrice.vue";
import { V1Node } from "@kubernetes/client-node";
import {} from "../../lib/util";

export default defineComponent({
  components: { PodList, NodeResourceUsage, NodeTotalPrice },
  setup() {
    const nstore = inject(NodeStoreKey);
    if (!nstore) {
      throw new Error(`${NodeStoreKey.description} is not provided`);
    }

    const nodes = computed(() => nstore.nodes);

    const onClick = (node: V1Node) => {
      nstore.select(node, false);
    };

    const getNodePrice = (node: V1Node): string => {
      const pricePerHour = node.metadata?.annotations?.["simulator.kubernetes.io/price-per-hour"] || "0.00";
      return parseFloat(pricePerHour).toFixed(2);
    };
    
    return {
      nodes,
      onClick,
      getNodePrice,
    };
  },
});
</script>

<style scoped>
.position-relative {
  position: relative;
}

.node-name-truncate {
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}
</script>
