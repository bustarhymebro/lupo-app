// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "LupoCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "LupoCore", targets: ["LupoCore"])],
    targets: [
        .target(name: "LupoCore"),
        .testTarget(name: "LupoCoreTests", dependencies: ["LupoCore"])
    ]
)
