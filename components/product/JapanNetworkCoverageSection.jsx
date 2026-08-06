/**
 * @deprecated 請改用 NetworkCoverageSection + resolveCoverageCountry
 */
import NetworkCoverageSection from "./NetworkCoverageSection";
import { NETWORK_COVERAGE_COUNTRIES } from "@/lib/networkCoverageCountries";

export {
  isJapanEsimProduct,
  resolveCoverageCountry,
} from "@/lib/networkCoverageCountries";

export default function JapanNetworkCoverageSection(props) {
  return (
    <NetworkCoverageSection
      {...props}
      country={NETWORK_COVERAGE_COUNTRIES.japan}
    />
  );
}
