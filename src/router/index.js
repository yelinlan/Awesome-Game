import Vue from 'vue';
import Router from 'vue-router';

import NotFound from "./404";
Vue.use(Router);
const empty = [{
  path: "*",
  redirect: "/sweep"
}];

const routes = [
  {
    path: '/sweep',
    name: 'sweep',
    component: resolve => require(['../page/sweep'], resolve)
  },

  ...NotFound,
  ...empty
];

export default new Router({ routes });
