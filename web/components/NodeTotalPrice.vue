<template>
  <v-card v-if="nodes.length > 0" class="node-total-price ma-2" outlined>
    <v-card-title>Node Cost Summary</v-card-title>
    <v-card-text>
      <div class="d-flex align-center mb-2">
        <span class="font-weight-bold">Total Nodes:</span>
        <span class="ml-2">{{ nodes.length }}</span>
      </div>
      <div class="d-flex align-center mb-2">
        <span class="font-weight-bold">Total Cost:</span>
        <v-chip color="success" class="ml-2">${{ totalPrice.toFixed(2) }}/hr</v-chip>
      </div>
      <div class="d-flex align-center">
        <span class="font-weight-bold">Monthly Estimate:</span>
        <v-chip color="primary" class="ml-2">${{ (totalPrice * 730).toFixed(2) }}/month</v-chip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-icon v-bind="attrs" v-on="on" small class="ml-2">mdi-information-outline</v-icon>
          </template>
          <span>Based on 730 hours/month (30.42 days)</span>
        </v-tooltip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { computed, inject, defineComponent } from "@nuxtjs/composition-api";
import NodeStoreKey from "./StoreKey/NodeStoreKey";
import { V1Node } from "@kubernetes/client-node";

export default defineComponent({
  setup() {
    const nodeStore = inject(NodeStoreKey);
    if (!nodeStore) {
      throw new Error(`${NodeStoreKey.description} is not provided`);
    }

    const nodes = computed(() => nodeStore.nodes);

    const totalPrice = computed(() => {
      return nodes.value.reduce((total, node) => {
        // Get price from node annotations
        const pricePerHour = parseFloat(
          node.metadata?.annotations?.["simulator.kubernetes.io/price-per-hour"] || "0.00"
        );
        return total + pricePerHour;
      }, 0);
    });

    return {
      nodes,
      totalPrice,
    };
  },
});
</script>

<style scoped>
.node-total-price {
  max-width: 400px;
}
</style>