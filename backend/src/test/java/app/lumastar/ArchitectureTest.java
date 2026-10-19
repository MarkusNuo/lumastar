package app.lumastar;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "app.lumastar", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    /**
     * The adaptive logic stays plain Java so that it is testable without Spring or a database (PRD 11.3); the FSRS
     * library is plain Java as well and is wrapped by the scheduler adapter (PRD F8).
     */
    @ArchTest
    static final ArchRule coreDependsOnlyOnJavaAndTheDomain = classes()
            .that().resideInAPackage("app.lumastar.core..")
            .should().onlyDependOnClassesThat().resideInAnyPackage("java..", "app.lumastar.domain..", "app.lumastar.core..",
                    "io.github.openspacedrepetition..");

    @ArchTest
    static final ArchRule domainIsFrameworkFree = classes()
            .that().resideInAPackage("app.lumastar.domain..")
            .should().onlyDependOnClassesThat().resideInAnyPackage("java..", "app.lumastar.domain..", "com.fasterxml.jackson.annotation..");
}
