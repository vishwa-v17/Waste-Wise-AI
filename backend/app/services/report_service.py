import io
from datetime import date
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.core.security import escape_xml_text

class ReportService:
    @staticmethod
    def generate_pdf_report(
        user_name: str,
        user_type: str,
        inventory_items: list,
        waste_stats: dict,
        kpis: dict
    ) -> bytes:
        """
        Generates a comprehensive executive PDF report of Food Inventory,
        Expiry Risks, Priority Queue, and Waste Reduction Analytics.
        Hardened with XML-escaping to prevent markup injection or parser crashes.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Title"],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#15803d"),
            alignment=0
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#64748b")
        )
        h2_style = ParagraphStyle(
            "SectionHeader",
            parent=styles["Heading2"],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=14,
            spaceAfter=6
        )
        normal_style = styles["Normal"]

        story = []

        safe_user_name = escape_xml_text(user_name)
        safe_user_type = escape_xml_text(user_type.replace('_', ' ').title())

        # Header
        story.append(Paragraph("WasteWise AI — Inventory & Waste Audit Report", title_style))
        story.append(Paragraph(f"Generated on {date.today().isoformat()} | User: {safe_user_name} ({safe_user_type})", subtitle_style))
        story.append(Spacer(1, 14))

        # KPI Summary Table
        story.append(Paragraph("1. Executive Summary & KPIs", h2_style))
        kpi_data = [
            ["Metric", "Value", "Metric", "Value"],
            ["Total Inventory Items", str(kpis.get("total_inventory_items", 0)), "Expiring within 3 Days", str(kpis.get("expiring_within_3_days", 0))],
            ["High Risk Items", str(kpis.get("high_risk_items", 0)), "Potential Waste Quantity", f"{kpis.get('estimated_waste_qty', 0.0)} units"],
            ["Estimated Money at Risk", f"INR {kpis.get('estimated_money_at_risk', 0.0)}", "Estimated Potential Savings", f"INR {kpis.get('estimated_money_saved', 0.0)}"]
        ]
        t_kpi = Table(kpi_data, colWidths=[140, 120, 140, 120])
        t_kpi.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f0fdf4")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#166534")),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        story.append(t_kpi)
        story.append(Spacer(1, 14))

        # High Risk & Expiring Priority Items
        story.append(Paragraph("2. Critical & High Waste Risk Priority Queue", h2_style))
        table_headers = ["Product", "Qty", "Expiry", "Days", "Risk", "Loss Est.", "Recommended Action"]
        item_rows = [table_headers]

        for item in inventory_items[:15]:
            safe_prod = escape_xml_text(item.get("product_name", ""))
            safe_act = escape_xml_text(item.get("recommended_action", ""))
            item_rows.append([
                Paragraph(safe_prod, normal_style),
                f"{item.get('quantity', 0)} {item.get('unit', '')}",
                str(item.get("expiry_date", "")),
                str(item.get("days_to_expiry", 0)),
                f"{item.get('waste_risk_score', 0)} ({item.get('risk_level', '')})",
                f"INR {item.get('potential_financial_loss', 0.0)}",
                Paragraph(f"<b>{safe_act}</b>", normal_style)
            ])

        t_items = Table(item_rows, colWidths=[100, 50, 65, 40, 65, 60, 140])
        t_items.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        story.append(t_items)
        story.append(Spacer(1, 14))

        # Disclaimer
        disclaimer = (
            "<b>Disclaimer:</b> WasteWise AI is an inventory and waste-reduction decision-support system. "
            "Predictions are mathematical estimates based on shelf-life heuristics and consumption patterns. "
            "Never override official food-safety guidelines, temperature audits, or hygiene regulations."
        )
        story.append(Paragraph(disclaimer, ParagraphStyle("Disc", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#64748b"))))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

report_service = ReportService()
