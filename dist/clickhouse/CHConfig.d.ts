import { CHConfig } from '../types';
export declare class CHConfigHandler {
    /**
     * Handling ClickHouse table extendability via _options: extend: basename
     * @param config ClickHouse configuration
     */
    static extend(config: CHConfig): CHConfig;
}
