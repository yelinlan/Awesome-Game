<template>
  <div id="app">
    <Rain/>
    <router-view v-if="isRefresh"/>
  </div>
</template>

<script>

import Rain from "@/components/rain/rain.vue";

export default {
  name: "App",
  components: {
    Rain,
  },
  data() {
    return {
      isRefresh: true,
    };
  }
};
</script>

<style>

</style>