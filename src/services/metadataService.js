import axios from "axios";
import { config } from "../config/env.js";

export const metadataService = {
    async saveMetadata(metadata) {
        const { data } = await axios.post(config.jsonServerUrl, metadata);
        return data;
    },

    async getAllFiles() {
        const { data } = await axios.get(config.jsonServerUrl);
        return data;
    },

    async getFileById(id) {
        try {
            const { data } = await axios.get(`${config.jsonServerUrl}/${id}`);
            return data;
        } catch (err) {
            if (err?.response?.status === 404) return null;
            throw err;
        }
    },

    async getFileByStoredName(storedName) {
        const { data } = await axios.get(`${config.jsonServerUrl}`, {
            params: { storedName },
        });
        if (Array.isArray(data) && data.length > 0) return data[0];
        return null;
    },

    async deleteFileById(id) {
        await axios.delete(`${config.jsonServerUrl}/${id}`);
        return true;
    },

    async updateFileById(id, partial) {
        const { data } = await axios.patch(`${config.jsonServerUrl}/${id}`, partial);
        return data;
    },
};
