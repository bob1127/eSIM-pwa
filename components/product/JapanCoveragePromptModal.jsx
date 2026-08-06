/**
 * @deprecated 請改用 CoveragePromptModal
 */
import CoveragePromptModal, {
  hasCoverageAck,
  markCoverageAck,
  hasJapanCoverageAck,
  markJapanCoverageAck,
} from "./CoveragePromptModal";
import { NETWORK_COVERAGE_COUNTRIES } from "@/lib/networkCoverageCountries";

export {
  hasCoverageAck,
  markCoverageAck,
  hasJapanCoverageAck,
  markJapanCoverageAck,
};

export default function JapanCoveragePromptModal(props) {
  return (
    <CoveragePromptModal
      {...props}
      country={props.country || NETWORK_COVERAGE_COUNTRIES.japan}
    />
  );
}
