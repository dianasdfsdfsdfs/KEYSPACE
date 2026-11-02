<script setup>
import { onMounted } from 'vue';
import BackgroundCanvas from './components/three/BackgroundCanvas.vue';
import SiteHeader from './components/layout/SiteHeader.vue';
import SiteFooter from './components/layout/SiteFooter.vue';
import HeroSection from './components/sections/HeroSection.vue';
import IntroSection from './components/sections/IntroSection.vue';
import TimelineSection from './components/sections/TimelineSection.vue';
import BridgeSection from './components/sections/BridgeSection.vue';
import LabSection from './components/sections/LabSection.vue';
import DefenseSection from './components/sections/DefenseSection.vue';
import { initScroll } from './lib/scroll.js';

onMounted(() => {
  initScroll();
});
</script>

<template>
  <BackgroundCanvas />
  <SiteHeader />
  <main>
    <HeroSection />
    <IntroSection />
    <TimelineSection />
    <BridgeSection />
    <LabSection />
    <DefenseSection />
  </main>
  <SiteFooter />
</template>
