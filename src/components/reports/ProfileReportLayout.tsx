import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PDFRenderOptions, ReportSchool } from "./profile-report-types";
import { DEFAULT_REPORT_SCHOOL, reportDate, reportText } from "./profile-report-format";

const styles = StyleSheet.create({
  page: { minHeight: 841.89, padding: 38, paddingBottom: 64, fontFamily: "Helvetica", fontSize: 10, color: "#172033", backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#dbe2ea", paddingBottom: 20, height: 100 },
  brand: { flexDirection: "row", width: 335 },
  logo: { width: 44, height: 44, objectFit: "contain", marginRight: 12 },
  logoFallback: { width: 44, height: 44, marginRight: 12, backgroundColor: "#eff4f8", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#355779" },
  brandText: { width: 270 },
  schoolName: { fontFamily: "Helvetica-Bold", fontSize: 14, lineHeight: 1.25, maxLines: 2, textOverflow: "ellipsis" },
  subtitle: { fontSize: 8, color: "#64748b", marginTop: 5, lineHeight: 1.3, maxLines: 2, textOverflow: "ellipsis" },
  reportMeta: { width: 145, alignItems: "flex-end" },
  reportType: { fontFamily: "Helvetica-Bold", fontSize: 9, letterSpacing: 1, color: "#355779" },
  timestamp: { fontSize: 8, color: "#64748b", marginTop: 8, textAlign: "right" },
  profile: { paddingTop: 25, paddingBottom: 22, height: 140 },
  kicker: { fontSize: 8, letterSpacing: 1.5, color: "#64748b", marginBottom: 10 },
  nameRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  name: { width: 365, fontFamily: "Helvetica-Bold", fontSize: 24, lineHeight: 1.15, maxLines: 2, textOverflow: "ellipsis" },
  badge: { fontSize: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 5, maxWidth: 130, maxLines: 2, textOverflow: "ellipsis", backgroundColor: "#f1f5f9", color: "#475569" },
  activeBadge: { backgroundColor: "#eaf5ef", color: "#216544" },
  role: { fontSize: 11, color: "#64748b", marginTop: 10, maxLines: 1, textOverflow: "ellipsis" },
  metrics: { flexDirection: "row", gap: 10, marginBottom: 28 },
  metric: { flex: 1, height: 92, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 7, padding: 13, backgroundColor: "#f8fafc" },
  metricLabel: { fontSize: 8, color: "#64748b", marginBottom: 9 },
  metricValue: { fontFamily: "Helvetica-Bold", fontSize: 15, maxLines: 2, textOverflow: "ellipsis" },
  metricNote: { fontSize: 7, color: "#64748b", marginTop: 6, maxLines: 2, textOverflow: "ellipsis" },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 12 },
  detailRow: { flexDirection: "row", height: 46, borderBottomWidth: 1, borderBottomColor: "#e8edf2", paddingVertical: 10 },
  detailLabel: { width: 130, fontSize: 9, color: "#64748b" },
  detailValue: { flex: 1, fontSize: 10, lineHeight: 1.3, maxLines: 2, textOverflow: "ellipsis" },
  footer: { position: "absolute", left: 38, right: 38, bottom: 28, borderTopWidth: 1, borderTopColor: "#dbe2ea", paddingTop: 12, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#64748b", width: 440, maxLines: 1, textOverflow: "ellipsis" },
  pageNumber: { fontSize: 7, color: "#64748b" }
});

interface Metric { label: string; value: string; note?: string }
interface LayoutProps extends PDFRenderOptions {
  type: "STAFF REPORT" | "STUDENT REPORT";
  school?: ReportSchool;
  fullName: string;
  status: string;
  primaryRole: string;
  metrics: [Metric, Metric, Metric];
  details: [string, string][];
}

export function ProfileReportLayout({ type, school, fullName, status, primaryRole, metrics, details, generatedAt, logoDataUrl }: LayoutProps) {
  const schoolName = reportText(school?.name, DEFAULT_REPORT_SCHOOL);
  const initials = schoolName.split(/\s+/).slice(0, 3).map((word) => word[0]).join("").toUpperCase();
  const statusLabel = reportText(status, "Unknown").replace(/_/g, " ");
  return (
    <Document title={`${type} - ${fullName}`} author={schoolName} subject="Confidential individual profile report" language="en">
      <Page size="A4" orientation="portrait" wrap={false} style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {/* Network logos are validated by the browser before PDF rendering. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text -- This is a PDF primitive, not an HTML image. */}
            {logoDataUrl ? <Image src={logoDataUrl} style={styles.logo} /> : <View style={styles.logoFallback}><Text style={styles.initials}>{initials}</Text></View>}
            <View style={styles.brandText}>
              <Text style={styles.schoolName}>{schoolName}</Text>
              <Text style={styles.subtitle}>{reportText(school?.address || school?.subtitle, "School Administration • Individual Profile")}</Text>
            </View>
          </View>
          <View style={styles.reportMeta}>
            <Text style={styles.reportType}>{type}</Text>
            <Text style={styles.timestamp}>{reportDate(generatedAt, true)}</Text>
          </View>
        </View>
        <View style={styles.profile}>
          <Text style={styles.kicker}>PROFILE SUMMARY</Text>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{reportText(fullName)}</Text>
            <Text style={status.toLowerCase() === "active" ? [styles.badge, styles.activeBadge] : styles.badge}>{statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}</Text>
          </View>
          <Text style={styles.role}>{reportText(primaryRole)}</Text>
        </View>
        <View style={styles.metrics}>{metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={styles.metricLabel}>{metric.label.toUpperCase()}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
            {metric.note ? <Text style={styles.metricNote}>{metric.note}</Text> : null}
          </View>
        ))}</View>
        <Text style={styles.sectionTitle}>ESSENTIAL DETAILS</Text>
        {details.map(([label, value]) => <View key={label} style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>)}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Confidential • Issued by {schoolName}</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
