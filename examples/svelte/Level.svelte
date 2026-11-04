<script lang="ts">
  import "@johnmorrisdotca/tsunagi/element/define";

  let { grid = "6", level = 12 }: { grid?: string; level?: number } = $props();
</script>

<tsunagi-board {grid} {level}></tsunagi-board>
