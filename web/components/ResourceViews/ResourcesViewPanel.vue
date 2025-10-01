<template>
  <div>
    <NodeGroupPanel />
    <div v-if="IsAlphaTableViewEnabled()">
      <ResourcesDataTable />
    </div>
    <div v-else>
      <ResourcesList />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api";
import ResourcesList from "./Lists/ResourcesList.vue";
import ResourcesDataTable from "./DataTables/ResourcesDataTable.vue";
import NodeGroupPanel from "../NodeGroupPanel.vue";

export default defineComponent({
  components: {
    ResourcesList,
    ResourcesDataTable,
    NodeGroupPanel,
  },
  setup() {
    const IsAlphaTableViewEnabled = () => {
      return process.env.ALPHA_TABLE_VIEWS == "1";
    };

    return {
      IsAlphaTableViewEnabled,
    };
  },
});
</script>
