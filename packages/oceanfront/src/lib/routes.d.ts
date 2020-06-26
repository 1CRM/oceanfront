import { Router, RouteLocationNormalizedLoaded } from 'vue-router';
declare class RouteAccessor {
    protected _router: Router;
    protected _route: RouteLocationNormalizedLoaded;
    constructor(router: Router, route: RouteLocationNormalizedLoaded);
    get activeRoute(): RouteLocationNormalizedLoaded;
    get router(): Router;
}
export declare function useRoutes(): RouteAccessor | undefined;
export {};
//# sourceMappingURL=routes.d.ts.map