import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useTranslations } from "next-intl";
import { useMutation, gql } from "@apollo/client";
import { acceptGrowrTerms, rejectGrowrTerms } from "../../../redux/user";
import BaseContentLayout from "../../BaseContentLayout/BaseContentLayout";
import {
  createDidFormat,
  createPresentation,
  parseJwt,
} from "../../../utils/vcUtils";
import styles from "./ApprovedStep.module.css";
import { useWeb3React } from "@web3-react/core";
import { injected } from "../../../utils/connectors";
import { borrow, getPondCriteria } from "../../../utils/contractHelper.js";

const { ethers } = require("ethers");

const findCriterias = (requiredCriterias, allVcs) => {
  const foundVcs = [];
  requiredCriterias.forEach(({ name }) => {
    let foundVc = allVcs.find((vc) => {
      let parsedVc = parseJwt(vc);
      return !!parsedVc.vc.credentialSubject[name];
    });

    if (!foundVc) {
      console.error(
        `VC with name: ${name} that is required is not available for this user`
      );
    }
    foundVcs.push(foundVc);
  });
  return foundVcs;
};

function ApprovedStep({ onNext, setIsLoading }) {
  const { activate, library } = useWeb3React();

  useEffect(() => {
    try {
      activate(injected, undefined, true);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const walletId = useSelector((state) => state.user.walletId);
  const chainId = useSelector((state) => state.user.chainId);
  const offer = useSelector((state) => state.user.goals[0].offer);
  // const loan = useSelector((state) => state.user.goals[0].loan);
  const verifiableCredentials = useSelector(
    (state) => state.user.verifiableCredentials
  );
  const growrTermsAccepted = useSelector(
    (state) => state.user.growrTermsAccepted
  );
  const dispatch = useDispatch();

  const t = useTranslations("onboarding");

  const onChangeCheckbox = ({ target }) =>
    target.checked
      ? dispatch(acceptGrowrTerms())
      : dispatch(rejectGrowrTerms());

  const VERIFY_VCS = gql`
    mutation verifyVCs($did: String, $vps: [String], $pondAddress: String) {
      verifyVCs(did: $did, vps: $vps, pondAddress: $pondAddress)
    }
  `;

  const [verifyVCs, { data, loading, error }] = useMutation(VERIFY_VCS, {
    variables: {
      did: createDidFormat(walletId, chainId),
      // vps: '',
      // pondAddress: ''
    },
  });

  const onSubmit = async () => {
    // try {
    setIsLoading(true);

    const pondCriteria = await getPondCriteria(library, walletId, {
      pondAddress: offer.pondAddress,
    });

    const allRequiredVcs = findCriterias(pondCriteria, verifiableCredentials);
    console.log("allRequiredVcs", allRequiredVcs);

    const allVpJwts = await Promise.all(
      allRequiredVcs.map((verifiableCredential) => {
        return createPresentation(library, walletId, verifiableCredential);
      })
    );

    if (allVpJwts.length) {
      verifyVCs({
        variables: {
          vps: allVpJwts,
          pondAddress: offer.pondAddress,
        },
      })
        .then(async () => {
          console.log("Presentation verified, now borrow", offer.amount);
          await borrow(library, walletId, {
            amount: ethers.utils.parseUnits(offer.amount),
            duration: Number(offer.duration),
            pondAddress: offer.pondAddress,
          });
          console.log(`Borrower got the money`);

          onNext();
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
        });
    }
    // } catch (error) {
    //   console.log(error.message);
    // }

    // updateLoan()
    //   .then(() => {
    //     onNext()
    //   })
    //   .catch(err => err)
  };

  return (
    <BaseContentLayout
      {...{
        submitButtonProps: {
          label: t("page5.button_label"),
          onClick: onSubmit,
          disabled: !growrTermsAccepted /*|| !goalId*/,
        },
      }}
    >
      <div className={styles.wrapper}>
        <h1>{`${t("page5.title")}$${parseFloat(offer.amount).toFixed(
          2
        )}.🎉`}</h1>

        <h4>{t("page5.congratulations")}</h4>

        <div>
          - {t("page5.amount")} ${parseFloat(offer.amount).toFixed(2)}
        </div>
        <div>
          - {t("page5.apr")} {(offer.annualInterestRate * 100).toFixed(2)}%
        </div>
        <div>
          - {t("page5.duration")} {offer.duration} months
        </div>
        <div>
          - {t("page5.instalment")} $
          {parseFloat(offer.installmentAmount).toFixed(2)}
        </div>
        {/* <div>- {t('page5.next_instalment')} {loan.nextInstalment}</div>
        <div>- {t('page5.last_instalment')} {loan.lastInstalment}</div> */}
        <div>
          - {t("page5.total_to_repay")} $
          {parseFloat(offer.totalAmount).toFixed(2)}
        </div>
        <div>
          - {t("page5.total_interest")} $
          {parseFloat(offer.totalInterest).toFixed(2)}
        </div>

        <h4>{t("page5.loan_details")}</h4>

        <div className={styles.terms}>
          <input
            className={styles.checkbox}
            id="terms"
            name="terms"
            type="checkbox"
            checked={growrTermsAccepted}
            onChange={onChangeCheckbox}
          />
          <label htmlFor="terms">{t("page5.agreement_check")}</label>
        </div>

        <div className={styles.skip} onClick={() => onNext()}>
          {t("page5.skip")}
        </div>
      </div>
    </BaseContentLayout>
  );
}

export default ApprovedStep;
