import React, { useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { toWei } from 'web3-utils';

import { DialogButton } from 'app/components/Form/DialogButton';
import { ErrorBadge } from 'app/components/Form/ErrorBadge';
import { FormGroup } from 'app/components/Form/FormGroup';
import { useSlippage } from '../../../BuySovPage/components/BuyForm/useSlippage';
import { Slider } from '../../../BuySovPage/components/Slider';
import { useMaintenance } from 'app/hooks/useMaintenance';
import {
  discordInvite,
  sovAffiliateCookie,
  ethGenesisAddress,
} from 'utils/classifiers';

import { translations } from '../../../../../locales/i18n';
import { Asset } from '../../../../../types';
import {
  getLendingContractName,
  getTokenContract,
} from '../../../../../utils/blockchain/contract-helpers';
import { fromWei } from '../../../../../utils/blockchain/math-helpers';
import { AssetsDictionary } from '../../../../../utils/dictionaries/assets-dictionary';
import { TradingPairDictionary } from '../../../../../utils/dictionaries/trading-pair-dictionary';
import {
  toNumberFormat,
  weiToNumberFormat,
} from '../../../../../utils/display-text/format';
import { TxDialog } from '../../../../components/Dialogs/TxDialog';
import { LoadableValue } from '../../../../components/LoadableValue';
import { Dialog } from '../../../../containers/Dialog';
import { useApproveAndTrade } from '../../../../hooks/trading/useApproveAndTrade';
import { useTrading_resolvePairTokens } from '../../../../hooks/trading/useTrading_resolvePairTokens';
import { useAccount } from '../../../../hooks/useAccount';

import { useCookie } from 'app/hooks/useCookie';
import { useAffiliates_getAffiliatesUserReferrer } from 'app/hooks/affiliates/useAffiliates_getAffiliatesUserReferrer';
import { selectMarginTradePage } from '../../selectors';
import { actions } from '../../slice';
import { LiquidationPrice } from '../LiquidationPrice';
import { TxFeeCalculator } from '../TxFeeCalculator';
import { TradingPosition } from 'types/trading-position';
import { useGetEstimatedMarginDetails } from '../../../../hooks/trading/useGetEstimatedMarginDetails';
import { useCurrentPositionPrice } from '../../../../hooks/trading/useCurrentPositionPrice';

const maintenanceMargin = 15000000000000000000;

export function TradeDialog() {
  const [referrer, setReferrer] = useState<string | null>(null);
  const { t } = useTranslation();
  const account = useAccount();
  const { get: getCookie } = useCookie();
  const { checkMaintenance, States } = useMaintenance();
  const openTradesLocked = checkMaintenance(States.OPEN_MARGIN_TRADES);
  const { position, amount, pairType, collateral, leverage } = useSelector(
    selectMarginTradePage,
  );
  const [slippage, setSlippage] = useState(0.5);
  const dispatch = useDispatch();

  const {
    value,
    loading: referrerLoading,
    error,
  } = useAffiliates_getAffiliatesUserReferrer(account);

  useEffect(() => {
    if (!referrerLoading) {
      if (error) {
        console.log(error, value);
        return;
      }
      const referralWallet =
        value !== ethGenesisAddress ? value : getCookie(sovAffiliateCookie);
      if (
        referralWallet?.indexOf('0x') === 0 &&
        referralWallet?.length === 42 &&
        referralWallet.toLowerCase() !== account.toLowerCase()
      ) {
        setReferrer(referralWallet.toLowerCase());
      } else setReferrer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, value, referrerLoading]);

  const pair = useMemo(() => TradingPairDictionary.get(pairType), [pairType]);
  const asset = useMemo(() => AssetsDictionary.get(collateral), [collateral]);

  const {
    loanToken,
    collateralToken,
    useLoanTokens,
  } = useTrading_resolvePairTokens(pair, position, collateral);
  const contractName = getLendingContractName(loanToken);

  const { value: estimations } = useGetEstimatedMarginDetails(
    loanToken,
    leverage,
    useLoanTokens ? amount : '0',
    useLoanTokens ? '0' : amount,
    collateralToken,
  );

  const { minReturn } = useSlippage(estimations.collateral, slippage);

  const { price, loading } = useCurrentPositionPrice(
    loanToken,
    collateralToken,
    estimations.principal,
    position === TradingPosition.SHORT,
  );

  const { trade, ...tx } = useApproveAndTrade(
    pair,
    position,
    collateral,
    leverage,
    amount,
    minReturn,
    referrer || undefined,
  );

  const submit = () =>
    trade({
      pair,
      position,
      collateralToken,
      collateral,
      leverage,
      amount,
      minReturn,
      ...(referrer ? [referrer] : []),
    });

  const txArgs = [
    '0x0000000000000000000000000000000000000000000000000000000000000000', //0 if new loan
    toWei(String(leverage - 1), 'ether'),
    useLoanTokens ? amount : '0',
    useLoanTokens ? '0' : amount,
    getTokenContract(collateralToken).address,
    account, // trader
    minReturn,
    ...(referrer ? [referrer] : []),
    '0x',
  ];

  const txConf = {
    value: collateral === Asset.RBTC ? amount : '0',
  };

  return (
    <>
      <Dialog
        isOpen={!!position}
        onClose={() => dispatch(actions.closeTradingModal())}
      >
        <div className="tw-mw-340 tw-mx-auto">
          <h1 className="tw-mb-6 tw-text-white tw-text-center">
            {t(translations.marginTradePage.tradeDialog.title)}
          </h1>
          <div className="tw-text-sm tw-font-light tw-tracking-normal">
            <LabelValuePair
              label={t(translations.marginTradePage.tradeDialog.pair)}
              value={pair.name}
            />
            <LabelValuePair
              label={t(translations.marginTradePage.tradeDialog.leverage)}
              value={<>{toNumberFormat(leverage)}x</>}
            />
            <LabelValuePair
              label={t(translations.marginTradePage.tradeDialog.direction)}
              value={
                position === TradingPosition.LONG
                  ? t(translations.marginTradePage.tradeDialog.position.long)
                  : t(translations.marginTradePage.tradeDialog.position.short)
              }
            />
            <LabelValuePair
              label={t(translations.marginTradePage.tradeDialog.asset)}
              value={
                <>
                  <LoadableValue
                    loading={false}
                    value={weiToNumberFormat(amount, 4)}
                    tooltip={fromWei(amount)}
                  />{' '}
                  {asset.symbol}
                </>
              }
            />
            <LabelValuePair
              label={t(
                translations.marginTradePage.tradeDialog.maintananceMargin,
              )}
              value={<>{weiToNumberFormat(maintenanceMargin)}%</>}
            />
            <LabelValuePair
              label={t(
                translations.marginTradePage.tradeDialog.liquidationPrice,
              )}
              value={
                <>
                  <LiquidationPrice
                    asset={pair.shortAsset}
                    assetLong={pair.longAsset}
                    leverage={leverage}
                    position={position}
                  />{' '}
                  {pair.longDetails.symbol}
                </>
              }
            />
          </div>

          <FormGroup
            className="tw-mt-8"
            label={t(translations.buySovPage.slippageDialog.tolerance)}
          >
            <Slider
              value={slippage}
              onChange={e => setSlippage(e)}
              min={0.1}
              max={1}
              stepSize={0.05}
              labelRenderer={value => <>{value}%</>}
              labelValues={[0.1, 0.25, 0.5, 0.75, 1]}
            />
          </FormGroup>

          <FormGroup
            label={t(translations.marginTradePage.tradeDialog.entryPrice)}
            className="tw-mt-8"
          >
            <div className="tw-input-wrapper readonly">
              <div className="tw-input">
                <LoadableValue
                  loading={loading}
                  value={<>{toNumberFormat(price, 2)}</>}
                />
              </div>
              <div className="tw-input-append">{pair.longDetails.symbol}</div>
            </div>
          </FormGroup>
          <TxFeeCalculator
            args={txArgs}
            txConfig={txConf}
            methodName={referrer ? 'marginTradeAffiliate' : 'marginTrade'}
            contractName={contractName}
            condition={true}
          />
          <div className="tw-mt-4">
            {openTradesLocked && (
              <ErrorBadge
                content={
                  <Trans
                    i18nKey={translations.maintenance.openMarginTrades}
                    components={[
                      <a
                        href={discordInvite}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="tw-text-Red tw-text-xs tw-underline hover:tw-no-underline"
                      >
                        x
                      </a>,
                    ]}
                  />
                }
              />
            )}
          </div>
          <DialogButton
            confirmLabel={t(translations.common.confirm)}
            onConfirm={() => submit()}
            disabled={openTradesLocked}
            cancelLabel={t(translations.common.cancel)}
            onCancel={() => dispatch(actions.closeTradingModal())}
            className="tw-max-w-50"
          />
        </div>
      </Dialog>
      <TxDialog
        tx={tx}
        onUserConfirmed={() => dispatch(actions.closeTradingModal())}
      />
    </>
  );
}

interface LabelValuePairProps {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}

function LabelValuePair(props: LabelValuePairProps) {
  return (
    <div
      className={cn(
        'tw-flex tw-flex-row tw-justify-between tw-space-x-4 tw-mb-2',
        props.className,
      )}
    >
      <div className="tw-truncate tw-w-7/12">{props.label}</div>
      <div className="tw-truncate tw-w-5/12 tw-text-left">{props.value}</div>
    </div>
  );
}
