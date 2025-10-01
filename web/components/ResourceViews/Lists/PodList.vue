<template>
  <v-card-actions>
    <div v-for="(p, i) in pods" :key="i">
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-chip
            class="ma-2"
            color="primary"
            outlined
            large
            label
            @click.stop="onClick(p)"
            v-bind="attrs"
            v-on="on"
            @mouseover="setHoveredPod(p)"
          >
            <img src="/pod.svg" height="40" alt="p.metadata.name" class="mr-2" />
            {{ p.metadata.name }}
          </v-chip>
        </template>
        <div>
          <strong>{{ p.metadata.name }}</strong>
          <div v-if="getPodResources(p).cpu || getPodResources(p).memory">
            <div><strong>Requests:</strong></div>
            <div v-if="getPodResources(p).cpu">CPU: {{ getPodResources(p).cpu }}</div>
            <div v-if="getPodResources(p).memory">Memory: {{ getPodResources(p).memory }}</div>
          </div>
          <div v-else>No resource requests specified</div>
        </div>
      </v-tooltip>
    </div>
  </v-card-actions>
</template>

<script lang="ts">
import { V1Pod } from "@kubernetes/client-node";
import { computed, inject, defineComponent, ref } from "@nuxtjs/composition-api";
import {} from "../../lib/util";
import PodStoreKey from "../../StoreKey/PodStoreKey";
export default defineComponent({
  props: {
    nodeName: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const store = inject(PodStoreKey);
    if (!store) {
      throw new Error(`${PodStoreKey.description} is not provided`);
    }

    const onClick = (pod: V1Pod) => {
      store.select(pod, false);
    };

    const pods: any = computed(function () {
      return store.pods[props.nodeName];
    });

    const setHoveredPod = (pod: V1Pod) => {
      // This function is called when hovering over a pod
      // We don't need to store the hovered pod anymore since we pass it directly to getPodResources
    };

    // Get pod resources (CPU and Memory requests)
    const getPodResources = (pod: V1Pod) => {
      const resources = {
        cpu: '',
        memory: ''
      };

      // Check if pod has containers and resource requests
      if (pod.spec?.containers) {
        pod.spec.containers.forEach(container => {
          if (container.resources?.requests) {
            if (container.resources.requests.cpu) {
              resources.cpu += (resources.cpu ? ', ' : '') + container.resources.requests.cpu;
            }
            if (container.resources.requests.memory) {
              resources.memory += (resources.memory ? ', ' : '') + container.resources.requests.memory;
            }
          }
        });
      }

      return resources;
    };

    return {
      pods,
      onClick,
      setHoveredPod,
      getPodResources,
    };
  },
});
</script>
