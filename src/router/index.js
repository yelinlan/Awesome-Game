import {createRouter, createWebHistory} from 'vue-router'
import NotFound from "./404";
import sweep from "@/page/sweep/sweep.vue";


let routers = [
    {path: "/sweep", component: sweep},
    {
        path: "/",
        component: sweep,
        redirect: "/sweep",
    },
    ...NotFound,
];

let router = createRouter({
    routes: routers,
    history: createWebHistory()
});

export default router;