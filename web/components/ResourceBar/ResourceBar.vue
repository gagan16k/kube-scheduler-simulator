<template>
  <v-navigation-drawer
    v-model="drawer"
    fixed
    right
    temporary
    bottom
    width="70%"
  >
    <BarHeader
      title="Resource"
      :delete-on-click="deleteOnClick"
      :apply-on-click="applyOnClick"
      :editmode-on-change="
        () => {
          editmode = !editmode;
        }
      "
      :enable-delete-btn="selected && !selected.isNew && selected.isDeletable"
      :enable-editmode-switch="selected && !selected.isNew"
    />

    <v-divider></v-divider>

    <template v-if="editmode">
      <v-spacer v-for="n in 3" :key="n" />
      <v-divider></v-divider>
      
      <!-- Add Random Pod Values Button (only for Pod resources) -->
      <v-row v-if="selectedResourceKind() === 'Pod'" class="px-4 py-2">
        <v-col>
          <v-btn 
            color="success"
            @click="generateRandomPodValues"
            small
          >
            Generate Random Values
          </v-btn>
        </v-col>
      </v-row>

      <YamlEditor v-model="formData" />
    </template>

    <template v-if="!editmode">
      <SchedulingResults v-if="selectedResourceKind() == 'Pod'" :selected="selectedPod" />
      <ResourceDefinitionTree :items="treeData" />
      <!-- This is required to work around the vuetify's bug, refer more details in #10 -->
      <div style="height: 80%"></div>
    </template>
  </v-navigation-drawer>
</template>
<script lang="ts">
import {
  ref,
  computed,
  inject,
  watch,
  defineComponent,
} from "@nuxtjs/composition-api";
import yaml from "js-yaml";
import PodStoreKey from "../StoreKey/PodStoreKey";
import { objectToTreeViewData } from "../lib/util";
import NodeStoreKey from "../StoreKey/NodeStoreKey";
import PersistentVolumeStoreKey from "../StoreKey/PVStoreKey";
import PersistentVolumeClaimStoreKey from "../StoreKey/PVCStoreKey";
import StorageClassStoreKey from "../StoreKey/StorageClassStoreKey";
import PriorityClassStoreKey from "../StoreKey/PriorityClassStoreKey";
import SchedulerConfigurationStoreKey from "../StoreKey/SchedulerConfigurationStoreKey";
import NamespaceStoreKey from "../StoreKey/NamespaceStoreKey";
import YamlEditor from "./YamlEditor.vue";
import SchedulingResults from "./SchedulingResults.vue";
import ResourceDefinitionTree from "./DefinitionTree.vue";
import BarHeader from "./BarHeader.vue";
import {
  V1Node,
  V1PersistentVolumeClaim,
  V1PersistentVolume,
  V1Pod,
  V1StorageClass,
  V1PriorityClassList,
  V1Namespace,
} from "@kubernetes/client-node";
import SnackBarStoreKey from "../StoreKey/SnackBarStoreKey";
import { SchedulerConfiguration } from "~/api/v1/types";

type Resource =
  | V1Pod
  | V1Node
  | V1PersistentVolumeClaim
  | V1PersistentVolume
  | V1StorageClass
  | V1PriorityClassList
  | SchedulerConfiguration
  | V1Namespace;

interface Store {
  readonly selected: object | null;
  resetSelected(): void;
  apply(_: Resource): Promise<void>;
  delete(_: Resource): Promise<void>;
  fetchSelected(): Promise<void>;
}

interface SelectedItem {
  isNew: boolean;
  item: Resource;
  resourceKind: string;
  isDeletable: boolean;
}

export default defineComponent({
  components: {
    YamlEditor,
    BarHeader,
    ResourceDefinitionTree,
    SchedulingResults,
  },
  setup() {
    var store: Store | null = null;

    // inject stores
    const podstore = inject(PodStoreKey);
    if (!podstore) {
      throw new Error(`${PodStoreKey.description} is not provided`);
    }
    const nodestore = inject(NodeStoreKey);
    if (!nodestore) {
      throw new Error(`${NodeStoreKey.description} is not provided`);
    }
    const pvstore = inject(PersistentVolumeStoreKey);
    if (!pvstore) {
      throw new Error(`${PersistentVolumeStoreKey.description} is not provided`);
    }
    const pvcstore = inject(PersistentVolumeClaimStoreKey);
    if (!pvcstore) {
      throw new Error(`${PersistentVolumeClaimStoreKey.description} is not provided`);
    }
    const storageclassstore = inject(StorageClassStoreKey);
    if (!storageclassstore) {
      throw new Error(`${StorageClassStoreKey.description} is not provided`);
    }
    const priorityclassstore = inject(PriorityClassStoreKey);
    if (!priorityclassstore) {
      throw new Error(`${PriorityClassStoreKey.description} is not provided`);
    }
    const schedulerconfigurationstore = inject(SchedulerConfigurationStoreKey);
    if (!schedulerconfigurationstore) {
      throw new Error(`${SchedulerConfigurationStoreKey.description} is not provided`);
    }
    const namespacestore = inject(NamespaceStoreKey);
    if (!namespacestore) {
      throw new Error(`${NamespaceStoreKey.description} is not provided`);
    }

    const snackbarstore = inject(SnackBarStoreKey);
    if (!snackbarstore) {
      throw new Error(`${SnackBarStoreKey.description} is not provided`);
    }

    const treeData = ref(objectToTreeViewData(null));

    // for edit mode
    const formData = ref("");

    // boolean to switch some view
    const drawer = ref(false);
    const editmode = ref(false);

    // watch each selected resource
    const selected = ref(null as SelectedItem | null);
    const selectedPod = ref(null as V1Pod | null)
    const pod = computed(() => podstore.selected);
    watch(pod, () => {
      store = podstore;
      selected.value = pod.value;
      if (pod.value?.item) {
        selectedPod.value = pod.value.item
      }
    });

    const node = computed(() => nodestore.selected);
    watch(node, () => {
      store = nodestore;
      selected.value = node.value;
    });

    const pv = computed(() => pvstore.selected);
    watch(pv, () => {
      store = pvstore;
      selected.value = pv.value;
    });

    const pvc = computed(() => pvcstore.selected);
    watch(pvc, () => {
      store = pvcstore;
      selected.value = pvc.value;
    });

    const sc = computed(() => storageclassstore.selected);
    watch(sc, () => {
      store = storageclassstore;
      selected.value = sc.value;
    });

    const pc = computed(() => priorityclassstore.selected);
    watch(pc, () => {
      store = priorityclassstore;
      selected.value = pc.value;
    });

    const config = computed(() => schedulerconfigurationstore.selected);
    watch(config, () => {
      store = schedulerconfigurationstore;
      selected.value = config.value;
    });

    const namespace = computed(() => namespacestore.selected);
    watch(namespace, () => {
      store = namespacestore;
      selected.value = namespace.value
    })

    watch(selected, (newVal, oldVal) => {
      if (selected.value) {
        if (!oldVal) {
          fetchSelected().then((_) => {
            if (selected.value) {
              editmode.value = selected.value.isNew;

              formData.value = yaml.dump(selected.value.item);
              treeData.value = objectToTreeViewData(selected.value.item);
              drawer.value = true;
            }
          });
        }
      }
    });

    watch(drawer, (newValue, _) => {
      if (!newValue) {
        // reset editmode.
        editmode.value = false;
        if (store) {
          store.resetSelected();
        }
        store = null;
        selected.value = null;
      }
    });

    const fetchSelected = async () => {
      if (store) {
        await store.fetchSelected().catch((e) => setServerErrorMessage(e));
      }
    };

    const setServerErrorMessage = (error: string) => {
      snackbarstore.setServerErrorMessage(error);
    };

    const applyOnClick = () => {
      if (store) {
        const y = <Resource>yaml.load(formData.value);
        store.apply(y).catch((e) => setServerErrorMessage(e));
      }
      drawer.value = false;
    };

    const deleteOnClick = () => {
      if (selectedResourceKind() === "Node") {
        // when the Node is deleted, all Pods on the Node should be deleted as well.
        //@ts-ignore
        if (podstore.pods[selected.value?.item.metadata?.name]) {
          //@ts-ignore
          podstore.pods[selected.value?.item.metadata?.name].forEach((p) => {
            //@ts-ignore
            if (p.spec?.nodeName === selected.value?.item.metadata?.name) {
              podstore
                //@ts-ignore
                .delete(p)
                .catch((e) => setServerErrorMessage(e));
            }
          });
        }
      }
      if (selectedResourceKind() != "SchedulerConfiguration") {
        //@ts-ignore // Only SchedulerConfiguration don't have the metadata field.
        if (selected.value?.item.metadata?.name && store) {
          store
            .delete(
              //@ts-ignore
              selected.value.item
            )
            .catch((e) => setServerErrorMessage(e));
        }
      }
      drawer.value = false;
    };
    const selectedResourceKind = () :String | undefined => {
      return selected.value?.resourceKind
    }

    // Helper function to calculate memory limit (2x the request)
    const calculateMemoryLimit = (memoryChoice: { value: number, unit: string }): string => {
      // If the memory value is already high, just return the same value to avoid excessive limits
      if (memoryChoice.unit === "Gi" && memoryChoice.value >= 32) {
        return `${memoryChoice.value}${memoryChoice.unit}`;
      }
      
      // Double the value
      if (memoryChoice.unit === "Mi") {
        if (memoryChoice.value * 2 >= 1024) {
          // Convert to Gi if doubled value exceeds 1024Mi
          return `${Math.floor((memoryChoice.value * 2) / 1024)}Gi`;
        }
        return `${memoryChoice.value * 2}Mi`;
      } else {
        // For Gi values
        return `${memoryChoice.value * 2}${memoryChoice.unit}`;
      }
    }

    // Function to generate random pod values in the YAML editor
    const generateRandomPodValues = () => {
      if (selectedResourceKind() === 'Pod') {
        try {
          // Parse the current YAML to get the pod object
          const currentPod = yaml.load(formData.value) as V1Pod;
          
          // Container images to choose from
          const containerImages = [
            'nginx:latest', 
            'redis:alpine', 
            'busybox:latest', 
            'python:3.9-slim',
            'node:16-alpine',
            'httpd:alpine'
          ];
          
          // Generate integer CPU cores (1-10 cores)
          const cpuCores = Math.floor(Math.random() * 10) + 1; // 1-10 CPU cores
          
          // Choose either power of 2 or multiple of 12 Gi for memory
          let memoryChoice;
          
          if (Math.random() > 0.5) {
            // Generate memory as power of 2 (512Mi to 64Gi)
            // Powers of 2: 512Mi, 1Gi, 2Gi, 4Gi, 8Gi, 16Gi, 32Gi, 64Gi
            const memoryPowers = [
              { value: 512, unit: "Mi" },
              { value: 1, unit: "Gi" },
              { value: 2, unit: "Gi" },
              { value: 4, unit: "Gi" },
              { value: 8, unit: "Gi" },
              { value: 16, unit: "Gi" },
              { value: 32, unit: "Gi" },
              { value: 64, unit: "Gi" }
            ];
            const memoryIndex = Math.floor(Math.random() * memoryPowers.length);
            memoryChoice = memoryPowers[memoryIndex];
          } else {
            // Generate memory as multiple of 12 Gi (12Gi, 24Gi, 36Gi, 48Gi, 60Gi)
            const memoryMultiples = [
              { value: 12, unit: "Gi" },
              { value: 24, unit: "Gi" },
              { value: 36, unit: "Gi" },
              { value: 48, unit: "Gi" },
              { value: 60, unit: "Gi" }
            ];
            const memoryIndex = Math.floor(Math.random() * memoryMultiples.length);
            memoryChoice = memoryMultiples[memoryIndex];
          }
          const memoryRequest = `${memoryChoice.value}${memoryChoice.unit}`;
          
          const randomImage = containerImages[Math.floor(Math.random() * containerImages.length)];
          const randomId = Math.floor(Math.random() * 10000);
          
          // Preserve metadata.name if it exists, otherwise generate a name
          const name = currentPod.metadata?.name || `random-pod-${randomId}`;
          
          // Create a new pod with random values
          const randomPod: V1Pod = {
            apiVersion: "v1",
            kind: "Pod",
            metadata: {
              name: name,
              namespace: currentPod.metadata?.namespace || "default",
              labels: {
                app: `random-app-${Math.floor(Math.random() * 10)}`,
                'created-by': 'simulator'
              }
            },
            spec: {
              containers: [
                {
                  name: "container-1",
                  image: randomImage,
                  resources: {
                    requests: {
                      cpu: cpuCores.toString(),
                      memory: memoryRequest
                    },
                    limits: {
                      cpu: (cpuCores * 2).toString(),
                      memory: calculateMemoryLimit(memoryChoice)
                    }
                  }
                }
              ]
            }
          };
          
          // Update the form data with the new random pod YAML
          formData.value = yaml.dump(randomPod);
          
          // Show a success message
          snackbarstore.setServerInfoMessage("Random pod values generated successfully!");
        } catch (error) {
          console.error("Error generating random pod values:", error);
          snackbarstore.setServerErrorMessage("Failed to generate random pod values");
        }
      }
    };

    return {
      drawer,
      editmode,
      selected,
      formData,
      treeData,
      applyOnClick,
      deleteOnClick,
      selectedResourceKind,
      selectedPod,
      generateRandomPodValues,
    };
  },
});
</script>
