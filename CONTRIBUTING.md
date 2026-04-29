# Contributing to ENVX2001 Resources

Anyone can contribute to this handbook. Below are brief guidelines.

## Ways to contribute

- **Open an issue** — describe what you saw, where, and what you expected. Start the conversation and we will help from there.
- **Send a pull request** — for changes you want to make directly.

In most cases, students can get away with just [opening an issue](https://github.com/ENVX-resources/ENVX2001-resources/issues) and we will figure out the rest together, whether that is a suggestion or a fix.


## Local setup

If you are sending a pull request instead, you will need a local copy of the project to work on. You can get this by [cloning the repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository). Then, install the following:

- [Quarto](https://quarto.org/docs/get-started/) (1.8 or newer — bundled with recent RStudio releases)
- A code editor, such as [RStudio](https://posit.co/downloads/) or [VS Code](https://code.visualstudio.com/) with the Quarto extension
- [R](https://cloud.r-project.org/) — only required if you are editing R code blocks

If you will be editing R code blocks, install the R packages used by the project (one-time, ~10 min):

```r
install.packages("pak")
pak::local_install_dev_deps()
```

This reads `DESCRIPTION` at the repo root and installs everything (CRAN packages and the two GitHub-only ones).

In short:

```bash
git clone https://github.com/ENVX-resources/ENVX2001-resources.git
```

The process of setting up and publishing the site is automated using GitHub Actions. See [Quarto publishing via GitHub Actions](https://quarto.org/docs/publishing/github-pages.html#github-action) for more information on how to do this.

## Making changes

1. Create a branch from `main`:
   ```bash
   git switch -c my-fix
   ```
2. Make your changes. Preview locally with `quarto preview` to check how they render.
3. Commit with a prefix that matches the section you are editing:

   | Prefix      | For changes to                                |
   |-------------|-----------------------------------------------|
   | `lecture:`  | `lectures/LXX/`                               |
   | `tutorial:` | `tutorials/`                                  |
   | `lab:`      | `labs/LabXX/`                                 |
   | `site:`     | `_quarto.yml`, sidebar, CSS, workflows        |
   | `data:`     | datasets in any `data/` subfolder             |
   | `admin:`    | everything else                               |

   Example: `lab: fix broken data path in Lab04`
4. Push your branch and open a pull request against `main`. Merging to `main` triggers automatic deployment, so preview locally first.

## Licence on contributions

By contributing to this handbook you agree that your contribution is released under the same [Creative Commons Attribution 4.0 International licence](LICENSE) as the rest of the material.
