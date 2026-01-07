<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const sidebarRef = ref<HTMLElement | null>(null);
const mainContentRef = ref<HTMLElement | null>(null);

const scrollSidebarToActive = () => {
	const sidebar = sidebarRef.value;
	if (!sidebar) {
		return;
	}

	const activeLink = sidebar.querySelector<HTMLElement>(
		".list-group-item.active",
	);
	if (!activeLink) {
		return;
	}

	activeLink.scrollIntoView({ block: "nearest", behavior: "smooth" });
};

const scrollMainToTop = () => {
	if (!mainContentRef.value) {
		return;
	}

	mainContentRef.value.scrollTo({ top: 0, behavior: "auto" });
};

const handleRouteChange = async () => {
	await nextTick();
	scrollSidebarToActive();
	scrollMainToTop();
};

onMounted(() => {
	void handleRouteChange();
});

watch(
	() => route.fullPath,
	() => {
		void handleRouteChange();
	},
);
</script>

<template>
  <RouterView v-slot="{ Component }">
    <div class="app-shell">
      <nav class="navbar navbar-expand-lg bg-light border-bottom fixed-top">
        <div class="container-fluid">
          <RouterLink class="navbar-brand" to="/">Taniguchi's Tools</RouterLink>
          <button
            class="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#sidebarMenu"
            aria-controls="sidebarMenu"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>
      </nav>

      <div class="container-fluid app-body">
        <div class="row">
          <!-- Sidebar / Accordion Area -->
          <div ref="sidebarRef" class="col-lg-2 pt-3 border-end sidebar-container">
            <div class="collapse d-lg-block" id="sidebarMenu">
              <div class="list-group list-group-flush mb-3">
                <template v-for="(group, index) in groupedTools" :key="group.category">
                  <div
                    class="list-group-item fw-bold text-muted small text-uppercase bg-light"
                    :class="{ 'mt-2': index > 0 }"
                  >
                    {{ group.category }}
                  </div>
                  <RouterLink
                    v-for="tool in group.items"
                    :key="tool.path"
                    class="list-group-item list-group-item-action"
                    active-class="active"
                    :to="tool.path"
                  >
                    {{ tool.icon }} {{ tool.name }}
                  </RouterLink>
                </template>
              </div>
            </div>
          </div>

          <!-- Main Content Area -->
          <div ref="mainContentRef" class="col-lg-10 pt-3 main-content">
            <component :is="Component" />
          </div>
        </div>
      </div>
    </div>
  </RouterView>
</template>

<script setup lang="ts">
import { tools } from "./tools";
import { computed } from "vue";

const groupedTools = computed(() => {
  const groups = new Map<string, typeof tools>();
  const order = ["Text & Coding", "Math & LaTeX", "Graphics & Images", "PDF Tools", "Utilities"];

  for (const cat of order) {
    groups.set(cat, []);
  }

  for (const tool of tools) {
    if (!groups.has(tool.category)) {
      groups.set(tool.category, []);
    }
    groups.get(tool.category)?.push(tool);
  }

  return Array.from(groups.entries())
    .filter(([_, items]) => items.length > 0)
    .map(([category, items]) => ({
      category,
      items,
    }));
});
</script>

<style>
:root {
  --app-header-height: 56px;
}

.app-shell {
  min-height: 100vh;
}

.app-body {
  padding-top: var(--app-header-height);
}

.sidebar-container,
.main-content {
  height: calc(100vh - var(--app-header-height));
  overflow-y: auto;
}

/* Mobile & Tablet adjustments */
@media (max-width: 991.98px) {
  .sidebar-container {
    border-end: none !important;
    border-bottom: 1px solid #dee2e6;
  }
}
</style>
