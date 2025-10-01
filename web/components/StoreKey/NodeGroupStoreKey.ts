import { InjectionKey } from "@nuxtjs/composition-api";
import nodeGroupStore from "~/store/nodegroup";

export default Symbol("NodeGroupStore") as InjectionKey<ReturnType<typeof nodeGroupStore>>;