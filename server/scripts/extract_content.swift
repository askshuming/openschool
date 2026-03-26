import Foundation
import Vision
import PDFKit
import CoreGraphics

struct InputPayload: Decodable {
    let assetBase64: String
    let mimeType: String?
    let fileName: String?
}

struct OutputPayload: Encodable {
    let method: String
    let text: String
    let pageCount: Int?
}

func writeOutput(_ payload: OutputPayload) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.withoutEscapingSlashes]
    if let data = try? encoder.encode(payload) {
        FileHandle.standardOutput.write(data)
    }
}

func recognizeText(handler: VNImageRequestHandler) throws -> String {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["zh-Hans", "en-US"]
    try handler.perform([request])
    let results = request.results as? [VNRecognizedTextObservation] ?? []
    return results
        .compactMap { $0.topCandidates(1).first?.string }
        .joined(separator: "\n")
}

func renderPDFPage(_ page: PDFPage) -> CGImage? {
    let bounds = page.bounds(for: .mediaBox)
    let scale: CGFloat = 2.0
    let width = max(Int(bounds.width * scale), 1)
    let height = max(Int(bounds.height * scale), 1)
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        return nil
    }

    context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height)))
    context.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: context)
    return context.makeImage()
}

let inputData = FileHandle.standardInput.readDataToEndOfFile()

do {
    let input = try JSONDecoder().decode(InputPayload.self, from: inputData)
    guard let binary = Data(base64Encoded: input.assetBase64) else {
        writeOutput(OutputPayload(method: "heuristic", text: "", pageCount: nil))
        exit(0)
    }

    let lowercasedName = input.fileName?.lowercased() ?? ""
    let isPDF = input.mimeType == "application/pdf" || lowercasedName.hasSuffix(".pdf")

    if isPDF, let document = PDFDocument(data: binary) {
        var pageTexts: [String] = []
        for index in 0..<min(document.pageCount, 3) {
            if let page = document.page(at: index),
               let text = page.string?.trimmingCharacters(in: .whitespacesAndNewlines),
               !text.isEmpty {
                pageTexts.append(text)
            }
        }

        let joinedText = pageTexts.joined(separator: "\n")
        if !joinedText.isEmpty {
            writeOutput(OutputPayload(method: "pdf_text", text: joinedText, pageCount: document.pageCount))
            exit(0)
        }

        if let firstPage = document.page(at: 0), let cgImage = renderPDFPage(firstPage) {
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            let text = try recognizeText(handler: handler)
            writeOutput(OutputPayload(method: "vision_ocr", text: text, pageCount: document.pageCount))
            exit(0)
        }
    }

    let handler = VNImageRequestHandler(data: binary, options: [:])
    let text = try recognizeText(handler: handler)
    writeOutput(OutputPayload(method: "vision_ocr", text: text, pageCount: nil))
} catch {
    writeOutput(OutputPayload(method: "heuristic", text: "", pageCount: nil))
    exit(0)
}
