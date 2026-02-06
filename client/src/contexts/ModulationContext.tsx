import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { Modulator, ModulationRoute, ModulatorType } from "@shared/schema";
import { MODULATOR_INDICATOR_COLORS } from "@/components/synth/ModulatorRack";

interface ModulationInfo {
  color: string;
  modulatorType: ModulatorType;
  modulatorName: string;
  depth: number;
}

interface ModulationContextValue {
  getModulationsForPath: (path: string) => ModulationInfo[];
  routes: ModulationRoute[];
  modulators: Modulator[];
}

const ModulationContext = createContext<ModulationContextValue | null>(null);

interface ModulationProviderProps {
  children: ReactNode;
  modulators: Modulator[];
  routes: ModulationRoute[];
}

export function ModulationProvider({ children, modulators, routes }: ModulationProviderProps) {
  const value = useMemo(() => {
    const modulatorMap = new Map<string, Modulator>();
    modulators.forEach(m => modulatorMap.set(m.id, m));

    const routesByTargetPath = new Map<string, ModulationRoute[]>();
    for (const r of routes) {
      const arr = routesByTargetPath.get(r.targetPath);
      if (arr) arr.push(r);
      else routesByTargetPath.set(r.targetPath, [r]);
    }

    const getModulationsForPath = (path: string): ModulationInfo[] => {
      const pathRoutes = routesByTargetPath.get(path) ?? [];
      return pathRoutes
        .map(route => {
          const modulator = modulatorMap.get(route.modulatorId);
          if (!modulator || !modulator.enabled) return null;
          return {
            color: MODULATOR_INDICATOR_COLORS[modulator.type] ?? "#9CA3AF",
            modulatorType: modulator.type,
            modulatorName: modulator.name,
            depth: route.depth,
          };
        })
        .filter((m): m is ModulationInfo => m !== null);
    };

    return {
      getModulationsForPath,
      routes,
      modulators,
    };
  }, [modulators, routes]);

  return (
    <ModulationContext.Provider value={value}>
      {children}
    </ModulationContext.Provider>
  );
}

export function useModulation(): ModulationContextValue {
  const context = useContext(ModulationContext);
  if (!context) throw new Error("useModulation must be used within ModulationProvider");
  return context;
}

export function useModulationsForPath(path: string): ModulationInfo[] {
  try {
    const context = useModulation();
    return context.getModulationsForPath(path);
  } catch {
    return [];
  }
}
