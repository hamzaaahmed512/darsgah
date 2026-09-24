import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ReportFooter, ReportHeader, ReportMetrics } from "./ProfileReportLayout";
import { DEFAULT_REPORT_SCHOOL, reportText } from "./profile-report-format";
import type { PDFRenderOptions } from "./profile-report-types";
import { expandReportRows, type ReportTemplateData } from "./report-template-types";

const styles = StyleSheet.create({
  page: { paddingTop: 154, paddingHorizontal: 38, paddingBottom: 68, fontFamily: "Helvetica", fontSize: 10, color: "#172033", backgroundColor: "#ffffff" },
  header: { position: "absolute", top: 38, left: 38, right: 38 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 22, marginBottom: 8 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 16, lineHeight: 1.4 },
  status: { fontSize: 9, color: "#355779", marginBottom: 12 },
  details: { marginBottom: 20 },
  detail: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e8edf2", paddingVertical: 9 },
  label: { width: 130, color: "#64748b", fontSize: 9 },
  value: { flex: 1, lineHeight: 1.4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#eff4f8", borderBottomWidth: 1, borderBottomColor: "#dbe2ea" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e8edf2" },
  cell: { flex: 1, padding: 7, fontSize: 9, lineHeight: 1.4 },
  heading: { fontFamily: "Helvetica-Bold", color: "#355779", fontSize: 8 },
  note: { fontSize: 9, lineHeight: 1.5, color: "#64748b", marginVertical: 16 },
  signatures: { flexDirection: "row", gap: 24, marginTop: 36 },
  signature: { flex: 1, borderTopWidth: 1, borderTopColor: "#94a3b8", paddingTop: 8, textAlign: "center", fontSize: 9 }
});

/** Shared app-wide vector template. Each logical report starts a fresh A4 page. */
export function ReportTemplatePDF({ data, generatedAt, logoDataUrl }: { data: ReportTemplateData } & PDFRenderOptions) {
  const sections = data.sections.length ? data.sections : [{ title: data.title, note: "No records available." }];
  return <Document title={data.title} author={reportText(data.school?.name, DEFAULT_REPORT_SCHOOL)} language="en">
    {sections.map((section, index) => <Page key={index} size="A4" orientation="portrait" style={styles.page}>
      <View fixed style={styles.header}><ReportHeader type="SCHOOL REPORT" school={data.school} generatedAt={generatedAt} logoDataUrl={logoDataUrl} /></View>
      <View wrap={false}>
        <Text style={styles.title}>{section.title}</Text>
        {section.subtitle ? <Text style={styles.subtitle}>{section.subtitle}</Text> : null}
        {section.status ? <Text style={styles.status}>{section.status}</Text> : null}
      </View>
      {section.metrics?.length ? <ReportMetrics metrics={section.metrics} /> : null}
      {section.details?.length ? <View style={styles.details}>{expandReportRows(section.details.map(([label, value]) => [label, reportText(value)])).map(([label, value], i) => <View key={i} style={styles.detail} wrap={false}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}</View> : null}
      {section.headers?.length ? <View style={styles.tableHeader} fixed>{section.headers.map((header, i) => <Text key={i} style={[styles.cell, styles.heading]}>{header}</Text>)}</View> : null}
      {expandReportRows(section.rows ?? []).map((row, rowIndex) => <View style={styles.row} key={rowIndex} wrap={false}>{row.map((cell, columnIndex) => <Text key={columnIndex} style={styles.cell}>{cell}</Text>)}</View>)}
      {section.headers?.length && !section.rows?.length ? <Text style={styles.note}>No records match the selected filters.</Text> : null}
      {section.note ? <Text style={styles.note}>{section.note}</Text> : null}
      {section.signatures?.length ? <View style={styles.signatures} wrap={false}>{section.signatures.map((label, i) => <Text key={i} style={styles.signature}>{label}</Text>)}</View> : null}
      <ReportFooter school={data.school} />
    </Page>)}
  </Document>;
}
