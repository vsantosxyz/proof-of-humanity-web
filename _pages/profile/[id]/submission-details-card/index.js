import {
  Box,
  Card,
  EthereumAccount,
  Flex,
  FundButton,
  Image,
  Link,
  Text,
  Video,
  useContract,
  useWeb3,
} from "@kleros/components";
import { User } from "@kleros/icons";
import { useEffect, useMemo, useState } from "react";
import {
  RedditIcon,
  RedditShareButton,
  TelegramIcon,
  TelegramShareButton,
  TwitterIcon,
  TwitterShareButton,
} from "react-share";
import { graphql, useFragment } from "relay-hooks";

import Deadlines from "./deadlines";
import GaslessVouchButton from "./gasless-vouch";
import UBICard from "./ubi-card";
import VouchButton from "./vouch-button";
import Voucher from "./voucher";

import { partyEnum, submissionStatusEnum, useEvidenceFile } from "data";

const submissionDetailsCardFragments = {
  contract: graphql`
    fragment submissionDetailsCardContract on Contract {
      submissionBaseDeposit
      submissionDuration
      requiredNumberOfVouches
      challengePeriodDuration
      ...deadlinesContract
    }
  `,
  submission: graphql`
    fragment submissionDetailsCardSubmission on Submission {
      id
      status
      registered
      submissionTime
      name
      disputed
      requests(
        orderBy: creationTime
        orderDirection: desc
        first: 1
        where: { registration: true }
      ) {
        arbitrator
        arbitratorExtraData
        lastStatusChange
        evidence(orderBy: creationTime, first: 1) {
          URI
        }
      }
      latestRequest: requests(
        orderBy: creationTime
        orderDirection: desc
        first: 1
      ) {
        challenges {
          disputeID
          roundsLength
          rounds(orderBy: creationTime, first: 1) {
            contributions {
              values
            }
            hasPaid
          }
        }
      }
      ...deadlinesSubmission
    }
  `,
  vouchers: graphql`
    fragment submissionDetailsCardVouchers on Submission @relay(plural: true) {
      id
      submissionTime
      name
      requests(
        orderBy: creationTime
        orderDirection: desc
        first: 1
        where: { registration: true }
      ) {
        evidence(orderBy: creationTime, first: 1) {
          URI
        }
      }
    }
  `,
};

export default function SubmissionDetailsCard({
  submission,
  contract,
  vouchers,
}) {
  const {
    requests: [request],
    latestRequest: [latestRequest],
    id,
    name,
    ...rest
  } = (submission = useFragment(
    submissionDetailsCardFragments.submission,
    submission
  ));

  const { lastStatusChange } = request;
  const {
    submissionBaseDeposit,
    submissionDuration,
    requiredNumberOfVouches,
    challengePeriodDuration,
  } = (contract = useFragment(
    submissionDetailsCardFragments.contract,
    contract
  ));

  const status = submissionStatusEnum.parse({ ...rest, submissionDuration });
  const { challenges } = latestRequest || {};

  // Note that there is a challenge object with first round data even if there
  // is no challenge.
  const challenge = (challenges && challenges[0]) || {};
  const { rounds, roundsLength } = challenge || {};
  const round = (rounds && rounds[0]) || {};
  const { hasPaid } = round || {};

  const evidence = useEvidenceFile()(request.evidence[0].URI);
  const contributions = useMemo(
    () =>
      round.contributions.map((contribution) =>
        partyEnum.parse(contribution.values)
      ),
    [round.contributions]
  );

  const compoundName =
    [evidence?.file?.firstName, evidence?.file?.lastName]
      .filter(Boolean)
      .join(" ") || name;
  const displayName =
    compoundName === name ? name : `${compoundName} (${name})`;

  const [arbitrationCost] = useContract(
    "klerosLiquid",
    "arbitrationCost",
    useMemo(
      () => ({
        address: request.arbitrator,
        args: [request.arbitratorExtraData],
      }),
      [request]
    )
  );
  const { web3 } = useWeb3();
  const totalCost = useMemo(
    () => arbitrationCost?.add(web3.utils.toBN(submissionBaseDeposit)),
    [arbitrationCost, web3.utils, submissionBaseDeposit]
  );
  const totalContribution = useMemo(
    () =>
      contributions.reduce(
        (acc, { Requester }) => acc.add(web3.utils.toBN(Requester)),
        web3.utils.toBN(0)
      ),
    [contributions, web3.utils]
  );

  const registeredGraphVouchers = useFragment(
    submissionDetailsCardFragments.vouchers,
    vouchers
  ).filter(
    ({ submissionTime }) =>
      Date.now() / 1000 - submissionTime < submissionDuration
  );

  const [offChainVouches, setOffChainVouches] = useState([]);
  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await (
        await fetch(
          `${process.env.NEXT_PUBLIC_VOUCH_DB_URL}/vouch/search?submissionId=${id}`
        )
      ).json();
      if (res && res.vouches && res.vouches.length > 0)
        setOffChainVouches(res.vouches[0].vouchers);
    })();
  }, [id]);

  const registeredVouchers = useMemo(() => {
    const vouchersSet = new Set();
    offChainVouches.forEach((v) => vouchersSet.add(v));
    registeredGraphVouchers.forEach((v) => vouchersSet.add(v.id));
    return [...vouchersSet];
  }, [offChainVouches, registeredGraphVouchers]);

  const shareTitle =
    status === submissionStatusEnum.Vouching
      ? "Register and vouch for this profile on Proof Of Humanity."
      : "Check out this profile on Proof Of Humanity.";

  const firstRoundFullyFunded = Number(roundsLength) === 1 && hasPaid[0];

  return (
    <Card
      mainSx={{
        alignItems: "stretch",
        flexDirection: ["column", null, null, "row"],
        padding: 0,
      }}
    >
      <Flex
        sx={{
          alignItems: "center",
          backgroundColor: "muted",
          flexDirection: "column",
          maxWidth: [null, null, null, 300],
          paddingX: 3,
          paddingY: 4,
          textAlign: "center",
        }}
      >
        <Image
          sx={{ objectFit: "contain" }}
          variant="avatar"
          src={evidence?.file?.photo}
        />
        <Text
          sx={{
            fontSize: 2,
            fontWeight: "bold",
            marginY: 2,
            overflowWrap: "anywhere",
          }}
        >
          {evidence instanceof Error
            ? "We are doing some maintenance work and will be online again soon."
            : evidence?.file?.name &&
              (name.replaceAll(/[^\s\w]/g, "") ===
              evidence.file.name.replaceAll(/[^\s\w]/g, "")
                ? evidence.file.name
                : "We are doing some maintenance work and will be online again soon.")}
        </Text>
        <Text sx={{ wordBreak: "break-word" }} count={2}>
          {evidence?.file ? evidence.file.bio || " " : null}
        </Text>
        <Box sx={{ marginY: 2, width: "100%" }}>
          {status === submissionStatusEnum.Vouching && (
            <>
              {((totalCost?.gt(totalContribution) &&
                Number(roundsLength) > 1) ||
                (Number(roundsLength) === 1 && !hasPaid[0])) && (
                <FundButton
                  totalCost={totalCost}
                  totalContribution={totalContribution}
                  contract="proofOfHumanity"
                  method="fundSubmission"
                  args={[id]}
                >
                  Fund Submission
                </FundButton>
              )}
              <GaslessVouchButton submissionID={id} />
              <VouchButton submissionID={id} />
            </>
          )}
        </Box>
        <Flex sx={{ width: "100%" }}>
          <Box
            sx={{
              flex: 1,
              marginBottom: 3,
              paddingX: 1,
            }}
          >
            <Text>Vouchers</Text>
            <Text sx={{ fontWeight: "bold", paddingX: 1 }}>
              {String(registeredVouchers.length)}/{requiredNumberOfVouches}
            </Text>
          </Box>
          {status !== submissionStatusEnum.Registered && (
            <Box
              sx={{
                flex: 1,
                borderLeftColor: "text",
                borderLeftStyle: "solid",
                borderLeftWidth: 1,
              }}
            >
              <Text>Deposit</Text>
              <Text sx={{ fontWeight: "bold" }}>
                {firstRoundFullyFunded
                  ? "100%"
                  : totalCost
                  ? `${(
                      totalContribution
                        .mul(web3.utils.toBN(10000)) // Basis points.
                        .div(totalCost)
                        .toNumber() / 100
                    ).toFixed(2)}%`
                  : "0%"}
              </Text>
            </Box>
          )}
        </Flex>
        {challenges?.length > 0 && challenge.disputeID !== null && (
          <Flex>
            {challenges?.length > 1 ? "Disputes" : "Dispute"}
            {challenges.map(({ disputeID }, i) => (
              <Link
                key={i}
                newTab
                href={`https://resolve.kleros.io/cases/${disputeID}`}
                sx={{ marginLeft: 1 }}
              >
                # {disputeID}
              </Link>
            ))}
          </Flex>
        )}
        <Box sx={{ marginTop: "auto" }}>
          <Deadlines
            submission={submission}
            contract={contract}
            status={status}
          />
        </Box>
      </Flex>
      <Box sx={{ flex: 1, padding: 4 }}>
        <Flex
          sx={{
            alignItems: "center",
            gap: 8,
            marginBottom: "4px",
          }}
        >
          <User />
          <Text as="span" sx={{ fontWeight: "bold" }}>
            {displayName}
          </Text>
        </Flex>
        <EthereumAccount
          diameter={16}
          address={id}
          sx={{
            marginBottom: 2,
            fontWeight: "bold",
          }}
        />
        <Video url={evidence?.file?.video} />
        <UBICard
          submissionID={id}
          lastStatusChange={lastStatusChange}
          challengePeriodDuration={challengePeriodDuration}
          status={status}
          registeredVouchers={registeredVouchers}
          firstRoundFullyFunded={firstRoundFullyFunded}
        />
        <Text
          sx={{
            marginTop: 2,
            marginBottom: 1,
            opacity: 0.45,
          }}
        >
          Vouched by:
        </Text>
        <Flex sx={{ flexWrap: "wrap" }}>
          {registeredVouchers.map((voucherId) => (
            <Voucher key={voucherId} submissionId={voucherId} />
          ))}
        </Flex>
        <Flex sx={{ justifyContent: "flex-end" }}>
          <RedditShareButton url={location.href} title={shareTitle}>
            <RedditIcon size={32} />
          </RedditShareButton>
          <TelegramShareButton url={location.href} title={shareTitle}>
            <TelegramIcon size={32} />
          </TelegramShareButton>
          <TwitterShareButton
            url={location.href}
            title={shareTitle}
            via="Kleros_io"
            hashtags={["kleros", "proofofhumanity"]}
          >
            <TwitterIcon size={32} />
          </TwitterShareButton>
        </Flex>
      </Box>
    </Card>
  );
}
