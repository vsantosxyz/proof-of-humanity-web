import { Settings } from "@kleros/icons";
import { Box, Flex, IconButton } from "theme-ui";

import Button from "./button";
import Divider from "./divider";
import Identicon from "./identicon";
import Image from "./image";
import NetworkTag from "./network-tag";
import { NextETHLink } from "./next-router";
import Popup from "./popup";
import Tabs, { Tab, TabList, TabPanel } from "./tabs";
import Text from "./text";
import UserSettings from "./user-settings";
import { useWeb3 } from "./web3-provider";

export default function AccountSettingsPopup({
  name,
  photo,
  userSettingsURL,
  settings,
  parseSettings,
  normalizeSettings,
}) {
  const [accounts] = useWeb3("eth", "getAccounts");
  const { connect } = useWeb3();
  return (
    <Popup
      contentStyle={{ width: 490 }}
      trigger={
        <IconButton>
          <Settings size="auto" />
        </IconButton>
      }
      position="bottom right"
    >
      <Box
        sx={{
          color: "text",
          paddingX: 1,
          paddingY: 2,
        }}
      >
        <Text
          sx={{
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Settings
        </Text>
        <Tabs>
          <TabList>
            <Tab>Account</Tab>
            <Tab>Notifications</Tab>
          </TabList>
          <TabPanel>
            <Text
              sx={{
                fontSize: 10,
                marginBottom: 3,
              }}
            >
              {accounts &&
                (accounts.length === 0 ? (
                  "Connected to Infura"
                ) : (
                  <Flex sx={{ alignItems: "center" }}>
                    {photo ? (
                      <Image
                        sx={{
                          objectFit: "contain",
                          width: 32,
                          height: 32,
                        }}
                        variant="avatar"
                        src={photo}
                      />
                    ) : (
                      <Identicon address={accounts[0]} />
                    )}
                    <Box sx={{ marginLeft: 1 }}>
                      {name && (
                        <Text sx={{ fontSize: 0, marginBottom: "4px" }}>
                          {name}
                        </Text>
                      )}
                      <NextETHLink address={accounts[0]}>
                        {accounts[0]}
                      </NextETHLink>
                    </Box>
                  </Flex>
                ))}
            </Text>
            <NetworkTag sx={{ mb: 1 }} />
            <Divider />
            <Button
              sx={{
                display: "block",
                marginTop: -2,
                marginX: "auto",
              }}
              onClick={connect}
            >
              {accounts &&
                `${accounts.length === 0 ? "Connect" : "Change"} Account`}
            </Button>
          </TabPanel>
          <TabPanel>
            <UserSettings
              userSettingsURL={userSettingsURL}
              settings={settings}
              parseSettings={parseSettings}
              normalizeSettings={normalizeSettings}
            />
          </TabPanel>
        </Tabs>
      </Box>
    </Popup>
  );
}
