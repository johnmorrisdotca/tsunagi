<script setup lang="ts">
import "@johnmorrisdotca/tsunagi/element/define";

withDefaults(defineProps<{ grid?: string; level?: number }>(), { grid: "6", level: 12 });
</script>

<template>
  <tsunagi-board :grid="grid" :level="level"></tsunagi-board>
</template>
