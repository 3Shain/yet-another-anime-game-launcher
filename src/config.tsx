import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectPlaceholder,
  SelectTrigger,
  SelectValue,
  VStack,
} from "@hope-ui/solid";
import { createSignal, For, onMount } from "solid-js";
import { checkCrossover } from "./crossover";
import { alert, getKey, prompt, setKey, _safeRelaunch } from "./utils";
import { WineVersionChecker } from "./wine";

export interface LauncherConfiguration {
  dxvkAsync: boolean;
  dxvkHud: "" | "fps" | "full";
  retina: boolean;
}

const launcherDefaultOption: LauncherConfiguration = {
  dxvkAsync: true,
  retina: false,
  dxvkHud: "fps",
};

export async function createConfiguration({
  wineVersionChecker,
}: {
  wineVersionChecker: WineVersionChecker;
}) {
  let div: HTMLDivElement = null!;
  const config = { ...launcherDefaultOption };
  try {
    config.dxvkAsync = (await getKey("config_dxvkAsyc")) == "true";
  } catch {}
  try {
    config.dxvkHud = (await getKey("config_dxvkHud")) as any; // FIXME: assertation
  } catch {}
  try {
    config.retina = (await getKey("config_retina")) == "true";
  } catch {}

  const currentWineVersion = await getKey("wine_tag");
  const crossoverVersion = (await checkCrossover())
    ? [
        {
          tag: "crossover",
          url: "not_applicable",
        },
      ]
    : [];
  const [currentConfig, setCurrentConfig] = createSignal({
    ...config,
    wine_tag: currentWineVersion,
  });
  const [wineVersions, setwineVersions] = createSignal(
    [
      {
        tag: currentWineVersion,
        url: "not_applicable",
      },
    ].filter((x) => x.tag !== "crossover")
  );
  (async () => {
    const versions = await wineVersionChecker.getAllReleases();
    if (versions.find((x) => x.tag === currentWineVersion)) {
      setwineVersions(versions);
    } else {
      setwineVersions((x) => [...x, ...versions]);
    }
  })();
  return {
    UI: function (props: { onClose: () => void }) {
      async function onSave() {
        if (config.dxvkAsync != currentConfig().dxvkAsync) {
          config.dxvkAsync = currentConfig().dxvkAsync;
          await setKey("config_dxvkAsyc", config.dxvkAsync ? "true" : "false");
        }
        if (config.dxvkHud != currentConfig().dxvkHud) {
          config.dxvkHud = currentConfig().dxvkHud;
          await setKey("config_dxvkHud", config.dxvkHud);
        }
        if (config.retina != currentConfig().retina) {
          config.retina = currentConfig().retina;
          await setKey("config_retina", config.retina ? "true" : "false");
        }
        if (currentWineVersion != currentConfig().wine_tag) {
          if (currentConfig().wine_tag == "crossover") {
            if (
              (await prompt(
                "CrossOver",
                `CrossOver?????????MoltenVK???????????????????????????????????????????????????????????????????????????????????????????????? https://github.com/3Shain/yet-another-anime-game-launcher/wiki/CrossOver%E6%A8%A1%E5%BC%8F%E4%BD%BF%E7%94%A8%E6%9C%80%E6%96%B0%E7%89%88MoltenVK
?????????????????????????????????????????????????????????
?????????????????????????????????`
              )) == true
            ) {
              await setKey("wine_state", "update");
              await setKey("wine_update_tag", "crossover");
              await setKey("wine_update_url", "");
              await _safeRelaunch();
            } else {
              setCurrentConfig((x) => {
                return { ...x, wine_tag: currentWineVersion };
              });
            }
          } else {
            await alert("?????????????????????", "?????????????????????wine??????");
            // await setKey("")
            await setKey("wine_state", "update");
            const tag = currentConfig().wine_tag;
            await setKey("wine_update_tag", tag);
            await setKey(
              "wine_update_url",
              wineVersions().find((x) => x.tag == tag)!.url
            );
            await _safeRelaunch();
          }

          return;
        }
        props.onClose();
      }
      return (
        <ModalContent>
          <ModalHeader>??????</ModalHeader>
          <ModalBody ref={div}>
            <VStack spacing={"$4"}>
              <FormControl id="wineVersion">
                <FormLabel>Wine ??????</FormLabel>
                <Select
                  value={currentConfig().wine_tag}
                  onChange={(value) =>
                    setCurrentConfig((x) => {
                      return { ...x, wine_tag: value };
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectPlaceholder>Choose an option</SelectPlaceholder>
                    <SelectValue />
                    <SelectIcon />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectListbox>
                      <For each={[...wineVersions(), ...crossoverVersion]}>
                        {(item) => (
                          <SelectOption value={item.tag}>
                            <SelectOptionText>{item.tag}</SelectOptionText>
                            <SelectOptionIndicator />
                          </SelectOption>
                        )}
                      </For>
                    </SelectListbox>
                  </SelectContent>
                </Select>
              </FormControl>
              <Divider />
              <FormControl id="dvxkAsync" mb="$4">
                <FormLabel>dxvk shader ?????????????????? (????????????)</FormLabel>
                <Box>
                  <Checkbox
                    checked={currentConfig().dxvkAsync}
                    onChange={() =>
                      setCurrentConfig((x) => {
                        return { ...x, dxvkAsync: !x.dxvkAsync };
                      })
                    }
                    size="md"
                  >
                    ??????
                  </Checkbox>
                </Box>
              </FormControl>
              <FormControl id="dxvkHud">
                <FormLabel>dxvk HUD</FormLabel>
                <Select
                  value={currentConfig().dxvkHud}
                  onChange={(value) =>
                    setCurrentConfig((x) => {
                      return { ...x, dxvkHud: value };
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectPlaceholder>Choose an option</SelectPlaceholder>
                    <SelectValue />
                    <SelectIcon />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectListbox>
                      <For
                        each={[
                          { value: "", name: "?????????" },
                          { value: "fps", name: "?????????fps" },
                          { value: "full", name: "??????????????????" },
                        ]}
                      >
                        {(item) => (
                          <SelectOption value={item.value}>
                            <SelectOptionText>{item.name}</SelectOptionText>
                            <SelectOptionIndicator />
                          </SelectOption>
                        )}
                      </For>
                    </SelectListbox>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormControl id="retina">
                <FormLabel>Retina ??????</FormLabel>
                <Box>
                  <Checkbox
                    checked={currentConfig().retina}
                    size="md"
                    onChange={() =>
                      setCurrentConfig((x) => {
                        return { ...x, retina: !x.retina };
                      })
                    }
                  >
                    ??????
                  </Checkbox>
                </Box>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={"$4"}>
              <Button variant="outline" onClick={props.onClose}>
                ??????
              </Button>
              <Button
                onClick={() => {
                  onSave();
                }}
              >
                ??????
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      );
    },
    config,
  };
}
