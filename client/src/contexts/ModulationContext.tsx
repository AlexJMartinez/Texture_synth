import { createContext, useContext, useMemo } from "react";
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
  children: React.ReactNode;
  modulators: Modulator[];
  routes: ModulationRoute[];
}

export function ModulationProvider({ children, modulators, routes }: ModulationProviderProps) {
  const value = useMemo(() => {
    const modulatorMap = new Map<string, Modulator>();
    modulators.forEach(m => modulatorMap.set(m.id, m));

    const getModulationsForPath = (path: string): ModulationInfo[] => {
      const pathRoutes = routes.filter(r => r.targetPath === path);
      return pathRoutes
        .map(route => {
          const modulator = modulatorMap.get(route.modulatorId);
          if (!modulator || !modulator.enabled) return null;
          return {
            color: MODULATOR_INDICATOR_COLORS[modulator.type],
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

export function useModulation() {
  return useContext(ModulationContext);
}

export function useModulationsForPath(path: string): ModulationInfo[] {
  const context = useContext(ModulationContext);
  if (!context) return [];
  return context.getModulationsForPath(path);
}
