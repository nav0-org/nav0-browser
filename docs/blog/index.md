---
layout: page
sidebar: false
aside: false
title: 'Nav0 Blog — Privacy, Browsers & the Open Web'
description: 'The Nav0 blog — privacy, browsers, and the open web. No-nonsense takes on why modern browsers collect too much data and what to do about it.'
---

<script setup>
import { computed } from 'vue';
import { data as rawPosts } from '../.vitepress/theme/posts.data';

const posts = computed(() =>
  rawPosts.map((p) => ({
    title: p.title,
    url: p.url,
    date: p.date,
    description: p.excerpt,
    tag: p.tag,
    author: p.author,
  })),
);
</script>

<BlogIndex
  :posts="posts"
  eyebrow="writing"
  heading="notes from the build."
/>
