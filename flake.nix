{
  description = "A Nix flake for a Node.js project using pnpm";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
    xc.url = "github:joerdav/xc";
  };

  outputs = { self, nixpkgs, flake-utils, xc, ... }:
    # This function iterates over x86_64-linux, aarch64-linux, x86_64-darwin, and aarch64-darwin
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            pkgs.nodejs
            pkgs.pnpm
            xc.packages.${system}.xc
          ];

          shellHook = ''
            echo "Node version: $(node --version)"
            echo "pnpm version: $(pnpm --version)"
          '';
        };
      }
    );
}