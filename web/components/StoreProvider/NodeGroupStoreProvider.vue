<template>
  <div>
    <slot />
  </div>
</template>

<script lang="ts">
import { provide, defineComponent } from "@nuxtjs/composition-api";
import nodeGroupStore from "~/store/nodegroup";
import NodeGroupStoreKey from "../StoreKey/NodeGroupStoreKey";

export default defineComponent({
  setup() {
    provide(NodeGroupStoreKey, nodeGroupStore());
    return {};
  },
});
</script>