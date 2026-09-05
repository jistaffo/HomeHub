import type { House, HouseData, HouseSummary } from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  listHouses: () => request<HouseSummary[]>("/houses"),
  createHouse: (name: string, data: HouseData) =>
    request<House>("/houses", { method: "POST", body: JSON.stringify({ name, data }) }),
  getHouse: (id: string) => request<House>(`/houses/${id}`),
  updateHouse: (id: string, name: string, data: HouseData) =>
    request<House>(`/houses/${id}`, { method: "PUT", body: JSON.stringify({ name, data }) }),
  deleteHouse: (id: string) => request<void>(`/houses/${id}`, { method: "DELETE" }),
};
